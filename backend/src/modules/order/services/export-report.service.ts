import { Service } from "typedi";
import { Order, OrderStatus } from "../models/order.model";
import { OrderDetail } from "../models/orderDetail.model";
import { Invoice } from "../../payment/models/invoice.model";
import type { FilterQuery } from "mongoose";

// bộ lọc
export interface ExportReportQuery {
  timeRange?: "all" | "today" | "week" | "month" | "custom";
  channel?: "all" | "online" | "pos";
  search?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

// số liệu tổng quan KPIs
export interface ExportReportKpis {
  totalExportedQuantity: number;
  exportedOnline: number;
  exportedPos: number;
  totalExportTransactions: number;
}


export interface ExportReportProduct {
  name: string;
  quantity: number;
  unitPrice: number;
}

// dữ liệu chi tiết của 1 mã xuất kho
export interface ExportReportItem {
  exportCode: string;
  orderId: string;
  /** Website Order ID (Online) or Invoice Number (POS) */
  orderRef: string;
  exportType: "Online" | "POS";
  exportDate: string;
  products: ExportReportProduct[];
  totalQuantity: number;
  /** Price breakdown — all from actual order fields */
  subtotalAmount: number;
  shippingFee: number;
  vatAmount: number;
  /** The final amount the customer actually pays */
  totalAmount: number;
  paymentMethod: string | null;
  shippingAddress: string | null;
}

export interface ExportReportPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ExportReportResponse {
  kpis: ExportReportKpis;
  items: ExportReportItem[];
  pagination: ExportReportPagination;
}

@Service()
export class ExportReportService {
  private buildFilter(query: ExportReportQuery): FilterQuery<any> {
    const filter: FilterQuery<any> = {
      status: { $in: [OrderStatus.DELIVERED, OrderStatus.SUCCESSFUL] },
    };

    if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.$or = [
        { completedAt: { $gte: start, $lte: end } },
        { completedAt: null, orderAt: { $gte: start, $lte: end } },
      ];
    } else if (query.timeRange && query.timeRange !== "all") {
      const now = new Date();
      let start: Date;

      switch (query.timeRange) {
        case "today":
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case "week": {
          const day = now.getDay();
          const diff = day === 0 ? 6 : day - 1;
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
          break;
        }
        case "month":
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          start = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      filter.$or = [
        { completedAt: { $gte: start } },
        { completedAt: null, orderAt: { $gte: start } },
      ];
    }

    if (query.channel && query.channel !== "all") {
      filter.orderType = query.channel === "online" ? 1 : 2;
    }

    return filter;
  }

  async getExportReport(query: ExportReportQuery): Promise<ExportReportResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(50, Number(query.limit) || 10));
    const filter = this.buildFilter(query);
    const searchTerm = query.search?.trim() ?? "";

    // Step 1: All matching order IDs
    const allMatchingOrders = await Order.find(filter).select("_id").lean();
    const allOrderIds = allMatchingOrders.map((o) => o._id);

    // Step 2: Search filter
    let filteredOrderIds = allOrderIds;

    if (searchTerm) {
      const idMatches = allOrderIds.filter((id) =>
        id.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );

      const detailMatches = await OrderDetail.find({ order: { $in: allOrderIds } })
        .populate({ path: "product", select: "name" })
        .lean();

      const productMatchOrderIds = new Set<string>();
      for (const d of detailMatches) {
        const productName = (d.product as any)?.name ?? "";
        if (productName.toLowerCase().includes(searchTerm.toLowerCase())) {
          productMatchOrderIds.add(d.order.toString());
        }
      }

      const idMatchSet = new Set(idMatches.map((id) => id.toString()));
      const mergedSet = new Set([...idMatchSet, ...productMatchOrderIds]);
      filteredOrderIds = allOrderIds.filter((id) => mergedSet.has(id.toString()));
    }

    // Step 3: KPIs
    const kpiDetails = await OrderDetail.find({ order: { $in: filteredOrderIds } })
      .populate({ path: "order", select: "orderType" })
      .lean();

    const kpis: ExportReportKpis = {
      totalExportedQuantity: 0,
      exportedOnline: 0,
      exportedPos: 0,
      totalExportTransactions: filteredOrderIds.length,
    };

    for (const d of kpiDetails) {
      const qty = d.quantity ?? 0;
      const orderType = (d.order as any)?.orderType;
      kpis.totalExportedQuantity += qty;
      if (orderType === 1) kpis.exportedOnline += qty;
      else if (orderType === 2) kpis.exportedPos += qty;
    }

    // Step 4: Paginate
    const totalItems = filteredOrderIds.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const skip = (page - 1) * limit;

    const paginatedOrders = await Order.find({ _id: { $in: filteredOrderIds } })
      .sort({ completedAt: -1, orderAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Step 5: Load order details
    const paginatedOrderIds = paginatedOrders.map((o) => o._id);

    const details = await OrderDetail.find({ order: { $in: paginatedOrderIds } })
      .populate({ path: "product", select: "name" })
      .lean();

    const detailsByOrder = new Map<string, typeof details>();
    for (const d of details) {
      const oid = d.order.toString();
      if (!detailsByOrder.has(oid)) detailsByOrder.set(oid, []);
      detailsByOrder.get(oid)!.push(d);
    }

    // Step 6: Load invoices to get invoiceNumber for POS orders
    const invoices = await Invoice.find({ order: { $in: paginatedOrderIds } })
      .select("order invoiceNumber paymentMethod")
      .lean();

    // Map orderId → first invoice
    const invoiceByOrder = new Map<string, { invoiceNumber: string | null; paymentMethod: string | null }>();
    for (const inv of invoices) {
      const oid = inv.order.toString();
      if (!invoiceByOrder.has(oid)) {
        invoiceByOrder.set(oid, {
          invoiceNumber: inv.invoiceNumber ?? null,
          paymentMethod: inv.paymentMethod ?? null,
        });
      }
    }

    // Step 7: Build response items
    const items: ExportReportItem[] = paginatedOrders.map((order) => {
      const orderId = order._id.toString();
      const orderDetails = detailsByOrder.get(orderId) ?? [];
      const invoice = invoiceByOrder.get(orderId);

      const products: ExportReportProduct[] = orderDetails.map((d) => ({
        name: (d.product as any)?.name ?? "Sản phẩm không xác định",
        quantity: d.quantity,
        unitPrice: d.unitPrice,
      }));

      const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);

      // For Online: use orderId as reference; for POS: use invoiceNumber
      const isPOS = order.orderType === 2;
      const orderRef = isPOS
        ? (invoice?.invoiceNumber ?? `POS-${orderId.slice(-8).toUpperCase()}`)
        : orderId;

      return {
        exportCode: `XK-${orderId.slice(-8).toUpperCase()}`,
        orderId,
        orderRef,
        exportType: isPOS ? "POS" : "Online",
        exportDate: (order.completedAt ?? order.orderAt)?.toISOString() ?? "",
        products,
        totalQuantity,
        // Actual price fields from the order document
        subtotalAmount: Number(order.subtotalAmount ?? 0),
        shippingFee: Number(order.shippingFee ?? 0),
        vatAmount: Number(order.vatAmount ?? 0),
        totalAmount: Number(order.totalAmount ?? 0),
        paymentMethod: order.paymentMethod ?? null,
        shippingAddress: order.shippingAddress ?? null,
      };
    });

    return {
      kpis,
      items,
      pagination: { page, limit, totalItems, totalPages },
    };
  }
}

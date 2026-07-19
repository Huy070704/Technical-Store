import { Service } from "typedi";
import { Invoice, InvoiceStatus } from "../../payment/models/invoice.model";
import { Order, OrderStatus } from "../../order/models/order.model";
import { OrderDetail } from "../../order/models/orderDetail.model";
import { Product } from "../../product/models/product.model";
import { Category } from "../../product/models/category.model";
import { Facility } from "../../facility/models/facility.model";
import { Inventory } from "../../inventory/models/inventory.model";
import { Account } from "../../auth/models/account.model";
import { Role } from "../../auth/models/role.model";
import ExcelJS from "exceljs";
import { Response } from "express";
import type { FilterQuery } from "mongoose";

export interface RevenueQuery {
  channel?: "all" | "online" | "pos";
  timeRange?: "today" | "7days" | "30days" | "custom";
  startDate?: string;
  endDate?: string;
}

@Service()
export class StatisticService {
  async getDashboardStatistics(
    facilityId: string | null = null,
    query?: { timeRange?: string; startDate?: string; endDate?: string; categoryId?: string }
  ) {
    // Nếu có facilityId (manager) thì lọc theo cơ sở
    const Types = (await import("mongoose")).Types;
    const facilityObjId = facilityId ? new Types.ObjectId(facilityId) : null;

    const timeRange = query?.timeRange || "30days";
    const now = new Date();
    const currentStart = new Date(now);
    const currentEnd = new Date(now);
    const prevStart = new Date(now);
    const prevEnd = new Date(now);

    if (timeRange === "today") {
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setHours(23, 59, 59, 999);

      prevStart.setDate(now.getDate() - 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(now.getDate() - 1);
      prevEnd.setHours(23, 59, 59, 999);
    } else if (timeRange === "7days") {
      currentStart.setDate(now.getDate() - 6);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setHours(23, 59, 59, 999);

      prevStart.setDate(now.getDate() - 13);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(now.getDate() - 7);
      prevEnd.setHours(23, 59, 59, 999);
    } else if (timeRange === "custom" && query?.startDate && query?.endDate) {
      currentStart.setTime(new Date(query.startDate).getTime());
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setTime(new Date(query.endDate).getTime());
      currentEnd.setHours(23, 59, 59, 999);

      const rangeMs = currentEnd.getTime() - currentStart.getTime();
      prevEnd.setTime(currentStart.getTime() - 1);
      prevStart.setTime(currentStart.getTime() - 1 - rangeMs);
    } else {
      // 30days
      currentStart.setDate(now.getDate() - 29);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setHours(23, 59, 59, 999);

      prevStart.setDate(now.getDate() - 59);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(now.getDate() - 30);
      prevEnd.setHours(23, 59, 59, 999);
    }

    // 1. Basic Counts
    const totalProducts = await Product.countDocuments({ isActive: true });

    // Tồn kho theo facility nếu là manager
    const LOW_STOCK_THRESHOLD = 10;
    const activeProducts = await Product.find({ isActive: true }).select("_id");
    const inventoryMatchStage: any = facilityObjId
      ? { $match: { facility: facilityObjId } }
      : { $match: {} };
    const stockRows = await Inventory.aggregate([
      inventoryMatchStage,
      { $group: { _id: "$product", total: { $sum: "$quantity" } } },
    ]);
    const stockByProduct = new Map<string, number>(
      stockRows.map((r: any) => [r._id.toString(), r.total as number])
    );
    let lowStockItems = 0;
    let outOfStockItems = 0;
    for (const prod of activeProducts) {
      const total = stockByProduct.get(prod._id.toString()) ?? 0;
      if (total === 0) outOfStockItems++;
      else if (total < LOW_STOCK_THRESHOLD) lowStockItems++;
    }

    const customerRole = await Role.findOne({ name: "customer" });
    const totalCustomers = customerRole
      ? await Account.countDocuments({ role: customerRole._id })
      : 0;

    // Đếm orders theo facility nếu là manager và theo thời gian chọn
    const orderBaseFilter: any = facilityObjId ? { facility: facilityObjId } : {};
    orderBaseFilter.orderAt = { $gte: currentStart, $lte: currentEnd };
    const totalOrders = await Order.countDocuments(orderBaseFilter);

    // 2. Financial Metrics
    // grossRevenue = sum of OrderDetail line items for completed orders (DELIVERED/SUCCESSFUL),
    // optionally filtered by category. This makes the KPI cards consistent with the category table.
    const completedOrderFilter: any = {
      ...orderBaseFilter,
      deletedAt: null,
      status: { $in: [OrderStatus.SUCCESSFUL, OrderStatus.DELIVERED] },
    };
    const completedOrders = await Order.find(completedOrderFilter)
      .select("_id totalAmount")
      .lean();
    const completedOrderIds = completedOrders.map((o: any) => o._id);

    // Build OrderDetail match stage (with optional category filter)
    let detailMatchStage: any = { order: { $in: completedOrderIds }, deletedAt: null };
    let filteredOrderIdsForKpi: any[] = completedOrderIds;

    if (query?.categoryId) {
      // Find all products in the selected category using the already-imported Product model
      const { Types: CatTypes } = await import("mongoose");
      const catProductIds = await Product.find(
        { categoryId: new CatTypes.ObjectId(query.categoryId), isActive: true },
        "_id"
      ).lean().then((docs: any[]) => docs.map((d: any) => d._id));

      detailMatchStage.product = { $in: catProductIds };

      // Restrict completed orders to only those containing the filtered products
      const orderIdsWithCat = await OrderDetail.find(
        { order: { $in: completedOrderIds }, product: { $in: catProductIds }, deletedAt: null },
        "order"
      ).lean().then((docs) => [...new Set(docs.map((d: any) => d.order.toString()))]);
      filteredOrderIdsForKpi = completedOrderIds.filter((id: any) =>
        orderIdsWithCat.includes(id.toString())
      );
    }

    // Aggregate revenue from OrderDetail line items
    const revenueAgg = await OrderDetail.aggregate([
      { $match: detailMatchStage },
      { $group: { _id: null, total: { $sum: { $multiply: ["$quantity", "$unitPrice"] } } } },
    ]);
    const grossRevenue = revenueAgg[0]?.total ?? 0;
    const netProfit = grossRevenue * 0.35; // 35% estimated profit margin
    const avgOrderValue = filteredOrderIdsForKpi.length > 0 ? grossRevenue / filteredOrderIdsForKpi.length : 0;

    const conversionRate = totalOrders > 0 && totalCustomers > 0
      ? Number(((totalOrders / totalCustomers) * 100).toFixed(2))
      : 0;

    // 3. Top Performing Products — lọc theo đơn hàng của cơ sở và khoảng thời gian
    const topProductsOrderQuery: any = { deletedAt: null };
    topProductsOrderQuery.orderAt = { $gte: currentStart, $lte: currentEnd };
    if (facilityObjId) {
      topProductsOrderQuery.facility = facilityObjId;
    }
    const filteredOrderIds = await Order.find(topProductsOrderQuery)
      .select("_id")
      .lean()
      .then((orders) => orders.map((o) => o._id));

    let topProductsMatchStage: any = { order: { $in: filteredOrderIds }, deletedAt: null };
    if (query?.categoryId) {
      const { Types: TopCatTypes } = await import("mongoose");
      const topCatProductIds = await Product.find(
        { categoryId: new TopCatTypes.ObjectId(query.categoryId), isActive: true },
        "_id"
      ).lean().then((docs: any[]) => docs.map((d: any) => d._id));
      topProductsMatchStage.product = { $in: topCatProductIds };
    }

    const topProductsRaw = await OrderDetail.aggregate([
      { $match: topProductsMatchStage },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$product.name",
          quantity: { $sum: "$quantity" },
          revenue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
    ]);

    const topProducts = topProductsRaw.map((row, idx) => ({
      rank: idx + 1,
      name: row._id || "Unknown Product",
      revenue: Number(row.revenue || 0),
      quantity: Number(row.quantity || 0),
      growth: "+10%",
      status: "In Stock",
    }));

    // 4. Payment Distribution — from completed orders (consistent with KPIs)
    const paymentCountMap = new Map<string, number>();
    const completedOrdersForPayment = await Order.find({
      _id: { $in: filteredOrderIdsForKpi },
      deletedAt: null,
    }).select("paymentMethod").lean();
    for (const ord of completedOrdersForPayment) {
      const method = ((ord as any).paymentMethod as string) || "Other";
      paymentCountMap.set(method, (paymentCountMap.get(method) ?? 0) + 1);
    }
    let paymentDistribution = Array.from(paymentCountMap.entries()).map(([method, count]) => ({
      method,
      count,
      percentage: 0,
    }));

    const totalCompletedForPayment = completedOrdersForPayment.length;
    if (totalCompletedForPayment > 0) {
      paymentDistribution.forEach((p) => {
        p.percentage = Math.round((p.count / totalCompletedForPayment) * 100);
      });
    }

    // 5. Recent High Value Transactions — lọc theo cơ sở và thời gian
    const recentInvoiceQuery: any = {
      deletedAt: null,
      createdAt: { $gte: currentStart, $lte: currentEnd },
    };
    if (facilityObjId) {
      const facilityOrderIds = await Order.find({ facility: facilityObjId, deletedAt: null })
        .select("_id")
        .lean()
        .then((orders) => orders.map((o) => o._id));
      recentInvoiceQuery.order = { $in: facilityOrderIds };
    }
    const recentInvoices = await Invoice.find(recentInvoiceQuery)
      .populate({ path: "order", populate: { path: "customerIdOrder" } })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentTransactions = recentInvoices.map((inv) => ({
      id: `#TX-${inv.invoiceNumber || inv.id.slice(0, 6).toUpperCase()}`,
      entity: (inv.order as any)?.customerIdOrder?.name || (inv.order as any)?.guestName || "Guest Customer",
      status: inv.status === InvoiceStatus.PAID ? "Settled" : (inv.status === InvoiceStatus.CANCELLED ? "Cancelled" : "Pending"),
      amount: Number(inv.totalAmount || 0),
    }));


    // 6. Real Revenue Trend — using OrderDetail aggregation (consistent with KPI grossRevenue)
    // Grouped by orderAt date of the completed orders
    const trendAgg = await OrderDetail.aggregate([
      { $match: detailMatchStage },
      {
        $lookup: {
          from: "orders",
          localField: "order",
          foreignField: "_id",
          as: "orderDoc",
        },
      },
      { $unwind: { path: "$orderDoc", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: timeRange === "today" ? "%H" : "%Y-%m-%d",
              date: "$orderDoc.orderAt",
              timezone: "+07:00",
            },
          },
          revenue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } },
        },
      },
    ]);
    const trendMap = new Map<string, number>(
      trendAgg.map((r: any) => [r._id as string, r.revenue as number])
    );

    const revenueTrend = [];
    if (timeRange === "today") {
      for (let h = 0; h < 24; h++) {
        const key = String(h).padStart(2, "0");
        revenueTrend.push({
          date: `${key}:00`,
          current: trendMap.get(key) ?? 0,
          previous: 0,
        });
      }
    } else {
      const daysCount = Math.round((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      for (let i = 0; i < daysCount; i++) {
        const currDate = new Date(currentStart);
        currDate.setDate(currentStart.getDate() + i);
        const year = currDate.getFullYear();
        const month = String(currDate.getMonth() + 1).padStart(2, "0");
        const day = String(currDate.getDate()).padStart(2, "0");
        const currKey = `${year}-${month}-${day}`;
        const dateString = `${day}/${month}`;
        revenueTrend.push({
          date: dateString,
          current: trendMap.get(currKey) ?? 0,
          previous: 0,
        });
      }
    }

    return {
      grossRevenue,
      netProfit,
      avgOrderValue,
      conversionRate,
      totalOrders,
      totalCustomers,
      totalProducts,
      lowStockItems,
      outOfStockItems,
      topProducts,
      paymentDistribution,
      recentTransactions,
      revenueTrend,
    };
  }

  async exportSalesReport(
    facilityId: string | null = null,
    query?: { timeRange?: string; startDate?: string; endDate?: string },
    res?: Response
  ) {
    const stats = await this.getDashboardStatistics(facilityId, query);

    const workbook = new ExcelJS.Workbook();

    const formatVNDText = (val: number) => {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(val);
    };

    // Sheet 1: Overview
    const wsOverview = workbook.addWorksheet("Business Overview");
    wsOverview.columns = [
      { header: "Metric Name", key: "metric", width: 30 },
      { header: "Value", key: "value", width: 25 },
    ];

    wsOverview.addRows([
      { metric: "Gross Revenue", value: formatVNDText(stats.grossRevenue) },
      { metric: "Net Profit", value: formatVNDText(stats.netProfit) },
      { metric: "Average Order Value", value: formatVNDText(stats.avgOrderValue) },
      { metric: "Conversion Rate", value: `${stats.conversionRate}%` },
      { metric: "Total Orders", value: stats.totalOrders },
      { metric: "Total Customers", value: stats.totalCustomers },
      { metric: "Total Active Products", value: stats.totalProducts },
      { metric: "Low Stock Items", value: stats.lowStockItems },
      { metric: "Out of Stock Items", value: stats.outOfStockItems },
    ]);

    wsOverview.getRow(1).font = { bold: true };


    if (res) {
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Disposition", "attachment; filename=sales-report.xlsx");
      await workbook.xlsx.write(res);
      res.end();
      return res;
    }
    return workbook;
  }

  async exportManagerStats(
    facilityId: string | null,
    type: "revenue" | "orders" | "products" | "customers",
    query: { timeRange?: string; startDate?: string; endDate?: string } = {},
    res: Response
  ) {
    const workbook = new ExcelJS.Workbook();
    const formatVNDText = (val: number) => {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(val);
    };

    const dashboardStats = await this.getDashboardStatistics(facilityId, query);
    const detailedStats = await this.getManagerDetailedStats(facilityId, query);

    if (type === "revenue") {
      // Sheet 1: KPIs
      const wsKPI = workbook.addWorksheet("KPIs Doanh thu");
      wsKPI.columns = [
        { header: "Chỉ số", key: "metric", width: 30 },
        { header: "Giá trị", key: "value", width: 25 },
      ];
      wsKPI.addRows([
        { metric: "Tổng doanh thu", value: formatVNDText(dashboardStats.grossRevenue) },
        { metric: "Lợi nhuận ước tính (35%)", value: formatVNDText(dashboardStats.netProfit) },
        { metric: "Giá trị đơn hàng trung bình", value: formatVNDText(dashboardStats.avgOrderValue) },
      ]);
      wsKPI.getRow(1).font = { bold: true };

      // Sheet 2: Doanh thu theo cơ sở
      const wsFacility = workbook.addWorksheet("Doanh thu Chi nhánh");
      wsFacility.columns = [
        { header: "Chi nhánh", key: "name", width: 30 },
        { header: "Doanh thu", key: "revenue", width: 20 },
        { header: "Số đơn hàng", key: "orderCount", width: 15 },
        { header: "Tỷ trọng (%)", key: "share", width: 15 },
      ];
      detailedStats.revenueByFacility.forEach((item) => {
        wsFacility.addRow({
          name: item.name,
          revenue: formatVNDText(item.revenue),
          orderCount: item.orderCount,
          share: `${item.share}%`,
        });
      });
      wsFacility.getRow(1).font = { bold: true };

      // Sheet 3: Doanh thu theo danh mục
      const wsCategory = workbook.addWorksheet("Doanh thu Danh mục");
      wsCategory.columns = [
        { header: "Danh mục", key: "name", width: 30 },
        { header: "Doanh thu", key: "revenue", width: 20 },
        { header: "Đã bán", key: "quantitySold", width: 15 },
        { header: "Tỷ trọng (%)", key: "share", width: 15 },
      ];
      detailedStats.revenueByCategory.forEach((item) => {
        wsCategory.addRow({
          name: item.name,
          revenue: formatVNDText(item.revenue),
          quantitySold: item.quantitySold,
          share: `${item.share}%`,
        });
      });
      wsCategory.getRow(1).font = { bold: true };

      // Sheet 4: Phương thức thanh toán
      const wsPayment = workbook.addWorksheet("Phương thức Thanh toán");
      wsPayment.columns = [
        { header: "Phương thức", key: "method", width: 25 },
        { header: "Số giao dịch", key: "count", width: 15 },
        { header: "Tỷ lệ (%)", key: "percentage", width: 15 },
      ];
      dashboardStats.paymentDistribution.forEach((item) => {
        wsPayment.addRow({
          method: item.method,
          count: item.count,
          percentage: `${item.percentage}%`,
        });
      });
      wsPayment.getRow(1).font = { bold: true };
    } else if (type === "orders") {
      // Sheet 1: Tổng quan
      const wsSummary = workbook.addWorksheet("Tổng quan Đơn hàng");
      wsSummary.columns = [
        { header: "Trạng thái", key: "status", width: 30 },
        { header: "Số lượng đơn", key: "count", width: 15 },
      ];
      const b = detailedStats.orderStatusBreakdown;
      const completed = b.delivered + b.successful;
      const processing = b.processing + b.shipping;
      wsSummary.addRows([
        { status: "Tổng số đơn", count: b.total },
        { status: "Đơn hoàn thành", count: completed },
        { status: "Đơn đang xử lý", count: processing },
        { status: "Đơn đã hủy", count: b.cancelled },
      ]);
      wsSummary.getRow(1).font = { bold: true };

      // Sheet 2: Phân bổ trạng thái chi tiết
      const wsDistribution = workbook.addWorksheet("Chi tiết Trạng thái");
      wsDistribution.columns = [
        { header: "Trạng thái", key: "status", width: 25 },
        { header: "Số đơn", key: "count", width: 15 },
      ];
      wsDistribution.addRows([
        { status: "Chờ xác nhận", count: b.pending },
        { status: "Đang xử lý", count: b.processing },
        { status: "Đang giao", count: b.shipping },
        { status: "Giao thất bại", count: b.deliveryFailed },
        { status: "Đã giao", count: b.delivered },
        { status: "Thành công", count: b.successful },
        { status: "Đã hủy", count: b.cancelled },
      ]);
      wsDistribution.getRow(1).font = { bold: true };

      // Sheet 3: Giao dịch gần đây
      const wsRecent = workbook.addWorksheet("Giao dịch gần đây");
      wsRecent.columns = [
        { header: "Mã giao dịch", key: "id", width: 20 },
        { header: "Khách hàng", key: "entity", width: 30 },
        { header: "Trạng thái", key: "status", width: 15 },
        { header: "Số tiền", key: "amount", width: 20 },
      ];
      dashboardStats.recentTransactions.forEach((item) => {
        wsRecent.addRow({
          id: item.id,
          entity: item.entity,
          status: item.status === "Settled" ? "Thành công" : "Chờ xử lý",
          amount: formatVNDText(item.amount),
        });
      });
      wsRecent.getRow(1).font = { bold: true };
    } else if (type === "products") {
      // Sheet 1: Tình trạng kho
      const wsStock = workbook.addWorksheet("Tình trạng Kho");
      wsStock.columns = [
        { header: "Chỉ số", key: "metric", width: 30 },
        { header: "Số lượng sản phẩm", key: "value", width: 20 },
      ];
      wsStock.addRows([
        { metric: "Tổng số sản phẩm hoạt động", value: dashboardStats.totalProducts },
        { metric: "Sản phẩm sắp hết hàng (<10)", value: dashboardStats.lowStockItems },
        { metric: "Sản phẩm đã hết hàng (0)", value: dashboardStats.outOfStockItems },
      ]);
      wsStock.getRow(1).font = { bold: true };

      // Sheet 2: Bán chạy
      const wsBest = workbook.addWorksheet("Sản phẩm Bán chạy");
      wsBest.columns = [
        { header: "Hạng", key: "rank", width: 10 },
        { header: "Tên sản phẩm", key: "name", width: 35 },
        { header: "Số lượng bán", key: "quantity", width: 15 },
        { header: "Doanh thu", key: "revenue", width: 20 },
      ];
      dashboardStats.topProducts.forEach((item) => {
        wsBest.addRow({
          rank: item.rank,
          name: item.name,
          quantity: item.quantity,
          revenue: formatVNDText(item.revenue),
        });
      });
      wsBest.getRow(1).font = { bold: true };

      // Sheet 3: Bán chậm
      const wsSlow = workbook.addWorksheet("Hàng Bán chậm");
      wsSlow.columns = [
        { header: "Sản phẩm", key: "name", width: 35 },
        { header: "Danh mục", key: "categoryName", width: 20 },
        { header: "Tồn kho hiện tại", key: "currentStock", width: 15 },
        { header: "Đã bán (30 ngày)", key: "sales30d", width: 18 },
        { header: "Doanh thu (30 ngày)", key: "revenue30d", width: 20 },
      ];
      detailedStats.slowMovingProducts.forEach((item) => {
        wsSlow.addRow({
          name: item.name,
          categoryName: item.categoryName,
          currentStock: item.currentStock,
          sales30d: item.sales30d,
          revenue30d: formatVNDText(item.revenue30d),
        });
      });
      wsSlow.getRow(1).font = { bold: true };
    } else if (type === "customers") {
      // Sheet 1: Tổng quan
      const wsCustOverview = workbook.addWorksheet("Tổng quan Khách hàng");
      wsCustOverview.columns = [
        { header: "Chỉ số", key: "metric", width: 35 },
        { header: "Giá trị", key: "value", width: 20 },
      ];
      const total = detailedStats.customerBreakdown.total;
      const newCust = detailedStats.customerBreakdown.newLast30Days;
      const returning = detailedStats.customerBreakdown.returning;
      const returningPercent = total > 0 ? Math.round((returning / total) * 100) : 0;
      wsCustOverview.addRows([
        { metric: "Tổng số khách hàng", value: total },
        { metric: "Khách hàng mới (30 ngày)", value: newCust },
        { metric: "Khách hàng quay lại", value: returning },
        { metric: "Tỷ lệ khách quay lại", value: `${returningPercent}%` },
      ]);
      wsCustOverview.getRow(1).font = { bold: true };

      // Sheet 2: Khách hàng mua nhiều nhất
      const wsTopCust = workbook.addWorksheet("Top Khách hàng");
      wsTopCust.columns = [
        { header: "Họ tên", key: "name", width: 25 },
        { header: "Email", key: "email", width: 30 },
        { header: "Số điện thoại", key: "phone", width: 15 },
        { header: "Số đơn hàng", key: "orderCount", width: 15 },
        { header: "Tổng tiền mua", key: "totalSpent", width: 20 },
      ];
      detailedStats.topCustomers.forEach((item) => {
        wsTopCust.addRow({
          name: item.name,
          email: item.email,
          phone: item.phone,
          orderCount: item.orderCount,
          totalSpent: formatVNDText(item.totalSpent),
        });
      });
      wsTopCust.getRow(1).font = { bold: true };
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    const date = new Date().toISOString().split('T')[0];
    res.setHeader("Content-Disposition", `attachment; filename=bao-cao-${type}-${date}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
    return res;
  }

  // ─── Revenue Management ───────────────────────────────────────────────────────

  private buildRevenueDateFilter(query: RevenueQuery): { $gte?: Date; $lte?: Date } | null {
    const now = new Date();
    if (query.timeRange === "custom" && query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      return { $gte: start, $lte: end };
    }
    if (query.timeRange === "today") {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { $gte: start, $lte: end };
    }
    if (query.timeRange === "7days") {
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { $gte: start };
    }
    if (query.timeRange === "30days") {
      const start = new Date(now);
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { $gte: start };
    }
    return null;
  }

  private buildRevenueFilter(query: RevenueQuery): FilterQuery<any> {
    const filter: FilterQuery<any> = { deletedAt: null };
    const dateRange = this.buildRevenueDateFilter(query);
    if (dateRange) {
      filter.orderAt = dateRange;
    }
    if (query.channel && query.channel !== "all") {
      filter.orderType = query.channel === "online" ? 1 : 2;
    }
    return filter;
  }

  async getRevenueStatistics(query: RevenueQuery) {
    const baseFilter = this.buildRevenueFilter(query);

    // ── 1. All matching orders ──────────────────────────────────────────────────
    const allOrders = await Order.find(baseFilter).lean();

    // Get paid invoices for completed orders (DELIVERED or SUCCESSFUL)
    const completedOrders = allOrders.filter(
      (o) => o.status === OrderStatus.SUCCESSFUL || o.status === OrderStatus.DELIVERED
    );
    const completedOrderIds = completedOrders.map((o) => o._id);

    const paidInvoices = await Invoice.find({
      order: { $in: completedOrderIds },
      status: InvoiceStatus.PAID,
      deletedAt: null,
    }).lean();

    const paidOrderIds = new Set(paidInvoices.map((inv) => inv.order.toString()));
    const netRevenueOrders = completedOrders.filter((o) => paidOrderIds.has(o._id.toString()));
    const netRevenueOrderIds = netRevenueOrders.map((o) => o._id);

    // ── 2. KPIs ────────────────────────────────────────────────────────────────
    const grossRevenue = allOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
    const netRevenue = netRevenueOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

    const successfulOrderCount = netRevenueOrders.length;
    const avgOrderValue = successfulOrderCount > 0 ? netRevenue / successfulOrderCount : 0;

    // ── 3. Revenue Trend ───────────────────────────────────────────────────────
    const revenueTrend = this.buildRevenueTrend(query, netRevenueOrders);

    // ── 4. Top 5 Products by Revenue ──────────────────────────────────────────
    const topProducts = await this.getTopProductsByRevenue(netRevenueOrderIds);

    // ── 5. Payment Method Distribution ────────────────────────────────────────
    const paymentDistribution = this.buildPaymentDistribution(netRevenueOrders);

    // ── 6. Transaction History (successful & paid orders only) ────────────────
    const transactionHistory = netRevenueOrders
      .sort((a, b) => {
        const dateA = new Date(a.completedAt ?? a.orderAt).getTime();
        const dateB = new Date(b.completedAt ?? b.orderAt).getTime();
        return dateB - dateA;
      })
      .slice(0, 100)
      .map((o) => ({
        transactionDate: (o.completedAt ?? o.orderAt)?.toISOString() ?? "",
        orderCode: `#${o._id.toString().slice(0, 8).toUpperCase()}`,
        salesChannel: o.orderType === 2 ? "POS" : "Online",
        paymentMethod: this.normalizePaymentLabel(o.paymentMethod ?? null),
        amount: Number(o.totalAmount || 0),
        paymentStatus: "Đã thanh toán",
      }));

    return {
      kpis: {
        grossRevenue,
        netRevenue,
        successfulOrderCount,
        avgOrderValue,
      },
      revenueTrend,
      topProducts,
      paymentDistribution,
      transactionHistory,
    };
  }

  private normalizePaymentLabel(method: string | null): string {
    if (!method) return "—";
    const m = method.toUpperCase();
    if (m === "CASH") return "Tiền mặt";
    if (m === "COD") return "COD";
    if (m === "TRANSFER" || m === "ONLINE" || m === "PAYOS" || m === "BANK_TRANSFER")
      return "Chuyển khoản";
    return method;
  }

  private buildPaymentDistribution(orders: any[]) {
    const groups: Record<string, { label: string; revenue: number; count: number }> = {
      CASH: { label: "Tiền mặt", revenue: 0, count: 0 },
      COD: { label: "COD", revenue: 0, count: 0 },
    };

    for (const o of orders) {
      const m = (o.paymentMethod ?? "").toUpperCase();
      const amount = Number(o.totalAmount || 0);
      if (m === "CASH") {
        groups.CASH.revenue += amount;
        groups.CASH.count += 1;
      } else if (m === "COD") {
        groups.COD.revenue += amount;
        groups.COD.count += 1;
      }
    }

    const totalRevenue = Object.values(groups).reduce((s, g) => s + g.revenue, 0);
    return Object.values(groups).map((g) => ({
      method: g.label,
      revenue: g.revenue,
      count: g.count,
      percentage: totalRevenue > 0 ? Math.round((g.revenue / totalRevenue) * 100) : 0,
    }));
  }

  private async getTopProductsByRevenue(orderIds: any[]) {
    if (orderIds.length === 0) return [];
    const raw = await OrderDetail.aggregate([
      { $match: { order: { $in: orderIds }, deletedAt: null } },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productDoc",
        },
      },
      { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$product",
          name: { $first: "$productDoc.name" },
          quantitySold: { $sum: "$quantity" },
          totalRevenue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
    ]);
    return raw.map((r, idx) => ({
      rank: idx + 1,
      name: r.name ?? "Sản phẩm không xác định",
      quantitySold: Number(r.quantitySold || 0),
      totalRevenue: Number(r.totalRevenue || 0),
    }));
  }

  private buildRevenueTrend(query: RevenueQuery, orders: any[]) {
    const now = new Date();

    if (query.timeRange === "today") {
      // 24 hourly buckets
      const buckets: { label: string; pos: number; online: number }[] = [];
      for (let h = 0; h < 24; h++) {
        buckets.push({ label: `${String(h).padStart(2, "0")}:00`, pos: 0, online: 0 });
      }
      for (const o of orders) {
        const date = new Date(o.orderAt);
        const h = date.getHours();
        const amount = Number(o.totalAmount || 0);
        if (o.orderType === 2) buckets[h].pos += amount;
        else buckets[h].online += amount;
      }
      return buckets;
    }

    // Determine day range
    let days = 30;
    let startDate: Date;
    if (query.timeRange === "7days") {
      days = 7;
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 6);
      startDate.setHours(0, 0, 0, 0);
    } else if (query.timeRange === "custom" && query.startDate && query.endDate) {
      startDate = new Date(query.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(query.endDate);
      days = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    } else {
      // 30days (default)
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    }

    const buckets: { label: string; pos: number; online: number }[] = [];
    for (let d = 0; d < days; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + d);
      const label = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
      buckets.push({ label, pos: 0, online: 0, _date: date.toISOString().slice(0, 10) } as any);
    }

    for (const o of orders) {
      const dateKey = new Date(o.orderAt).toISOString().slice(0, 10);
      const bucket = (buckets as any[]).find((b) => b._date === dateKey);
      if (!bucket) continue;
      const amount = Number(o.totalAmount || 0);
      if (o.orderType === 2) bucket.pos += amount;
      else bucket.online += amount;
    }

    return buckets.map(({ label, pos, online }: any) => ({ label, pos, online }));
  }

  async getManagerDetailedStats(
    facilityId: string | null = null,
    query?: { timeRange?: string; startDate?: string; endDate?: string; categoryId?: string }
  ) {
    const { Types } = await import("mongoose");
    const facilityObjId = facilityId ? new Types.ObjectId(facilityId) : null;

    const timeRange = query?.timeRange || "30days";
    const now = new Date();
    const currentStart = new Date(now);
    const currentEnd = new Date(now);

    if (timeRange === "today") {
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setHours(23, 59, 59, 999);
    } else if (timeRange === "7days") {
      currentStart.setDate(now.getDate() - 6);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setHours(23, 59, 59, 999);
    } else if (timeRange === "custom" && query?.startDate && query?.endDate) {
      currentStart.setTime(new Date(query.startDate).getTime());
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setTime(new Date(query.endDate).getTime());
      currentEnd.setHours(23, 59, 59, 999);
    } else {
      // 30days
      currentStart.setDate(now.getDate() - 29);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setHours(23, 59, 59, 999);
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Order status breakdown — đếm theo cơ sở của manager và khoảng thời gian
    const orderMatchBase: any = { deletedAt: null };
    if (facilityObjId) orderMatchBase.facility = facilityObjId;
    orderMatchBase.orderAt = { $gte: currentStart, $lte: currentEnd };

    const statusCounts = await Order.aggregate([
      { $match: orderMatchBase },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const statusMap = new Map<string, number>(
      statusCounts.map((r: any) => [r._id as string, r.count as number])
    );
    const totalOrders = Array.from(statusMap.values()).reduce((a, b) => a + b, 0);
    const orderStatusBreakdown = {
      total: totalOrders,
      pending: statusMap.get(OrderStatus.PENDING) ?? 0,
      processing: statusMap.get(OrderStatus.PROCESSING) ?? 0,
      shipping: statusMap.get(OrderStatus.SHIPPING) ?? 0,
      delivered: statusMap.get(OrderStatus.DELIVERED) ?? 0,
      deliveryFailed: statusMap.get(OrderStatus.DELIVERY_FAILED) ?? 0,
      cancelled: statusMap.get(OrderStatus.CANCELLED) ?? 0,
      successful: statusMap.get(OrderStatus.SUCCESSFUL) ?? 0,
    };

    // 2. Revenue by Facility — nếu là manager, chỉ hiển thị cơ sở của họ và theo thời gian
    const facilityRevenueMatchStage: any = { status: InvoiceStatus.PAID, deletedAt: null };
    facilityRevenueMatchStage.paidAt = { $gte: currentStart, $lte: currentEnd };
    const facilityRevenueRaw = await Invoice.aggregate([
      { $match: facilityRevenueMatchStage },
      {
        $lookup: {
          from: "orders",
          localField: "order",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },
      // Nếu là manager: chỉ lấy doanh thu của cơ sở mình
      ...(facilityObjId
        ? [{ $match: { "order.facility": facilityObjId } }]
        : []),
      {
        $group: {
          _id: "$order.facility",
          revenue: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = facilityRevenueRaw.reduce(
      (s: number, r: any) => s + Number(r.revenue || 0),
      0
    );

    // Lấy tên facility từ DB
    const facilityIds = facilityRevenueRaw
      .filter((r: any) => r._id)
      .map((r: any) => r._id);
    const facilities = await Facility.find({ _id: { $in: facilityIds } }).select("_id name address");
    const facilityNameMap = new Map<string, string>(
      facilities.map((f) => [f._id.toString(), f.name ?? "Chi nhánh không xác định"])
    );

    const revenueByFacility = facilityRevenueRaw
      .map((r: any) => ({
        facilityId: r._id ? r._id.toString() : null,
        name: r._id ? (facilityNameMap.get(r._id.toString()) ?? "Chi nhánh không xác định") : "Không xác định",
        revenue: Number(r.revenue || 0),
        orderCount: Number(r.orderCount || 0),
        share: totalRevenue > 0 ? Math.round((Number(r.revenue || 0) / totalRevenue) * 100) : 0,
      }))
      .sort((a: any, b: any) => b.revenue - a.revenue);

    // 3. Revenue by Category — filter by COMPLETED orders only (consistent with KPI cards)
    const completedCatOrderQuery: any = {
      deletedAt: null,
      status: { $in: [OrderStatus.SUCCESSFUL, OrderStatus.DELIVERED] },
    };
    if (facilityObjId) completedCatOrderQuery.facility = facilityObjId;
    completedCatOrderQuery.orderAt = { $gte: currentStart, $lte: currentEnd };
    const catOrderIds = await Order.find(completedCatOrderQuery)
      .select("_id")
      .lean()
      .then((orders) => orders.map((o) => o._id));

    const catDetailMatchStage: any = { deletedAt: null, order: { $in: catOrderIds } };
    // If a specific category is selected, filter only products in that category
    if (query?.categoryId) {
      const { Types: T } = await import("mongoose");
      const catProductIds = await Product.find(
        { categoryId: new T.ObjectId(query.categoryId), isActive: true },
        "_id"
      ).lean().then((docs) => docs.map((d) => d._id));
      catDetailMatchStage.product = { $in: catProductIds };
    }

    const categoryRevenueRaw = await OrderDetail.aggregate([
      { $match: catDetailMatchStage },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "categories",
          localField: "product.categoryId",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { id: "$category._id", name: "$category.name" },
          revenue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } },
          quantitySold: { $sum: "$quantity" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    const totalCatRevenue = categoryRevenueRaw.reduce(
      (s: number, r: any) => s + Number(r.revenue || 0),
      0
    );
    const revenueByCategory = categoryRevenueRaw.map((r: any) => ({
      categoryId: r._id?.id ? r._id.id.toString() : null,
      name: r._id?.name ?? "Chưa phân loại",
      revenue: Number(r.revenue || 0),
      quantitySold: Number(r.quantitySold || 0),
      share: totalCatRevenue > 0 ? Math.round((Number(r.revenue || 0) / totalCatRevenue) * 100) : 0,
    }));

    // 4. Top purchasing customers — lọc theo cơ sở của manager và khoảng thời gian
    const topCustMatchBase: any = {
      customerIdOrder: { $ne: null },
      status: { $in: [OrderStatus.SUCCESSFUL, OrderStatus.DELIVERED] },
      deletedAt: null,
    };
    if (facilityObjId) topCustMatchBase.facility = facilityObjId;
    topCustMatchBase.orderAt = { $gte: currentStart, $lte: currentEnd };

    const topCustomersRaw = await Order.aggregate([
      { $match: topCustMatchBase },
      {
        $group: {
          _id: "$customerIdOrder",
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount" },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "accounts",
          localField: "_id",
          foreignField: "_id",
          as: "customer",
        },
      },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
    ]);

    const topCustomers = topCustomersRaw.map((r: any) => ({
      customerId: r._id?.toString() ?? "",
      name: r.customer?.name ?? "Khách ẩn danh",
      email: r.customer?.username ?? "",
      phone: r.customer?.phone ?? "",
      orderCount: Number(r.orderCount || 0),
      totalSpent: Number(r.totalSpent || 0),
    }));

    // 5. Slow-moving products — tồn kho cao, doanh số 30 ngày thấp, lọc theo cơ sở (giữ nguyên 30 ngày)
    const soldLast30MatchBase: any = {
      "order.orderAt": { $gte: thirtyDaysAgo },
      deletedAt: null,
    };
    if (facilityObjId) soldLast30MatchBase["order.facility"] = facilityObjId;

    const soldLast30 = await OrderDetail.aggregate([
      {
        $lookup: {
          from: "orders",
          localField: "order",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },
      { $match: soldLast30MatchBase },
      {
        $group: {
          _id: "$product",
          sales30d: { $sum: "$quantity" },
          revenue30d: { $sum: { $multiply: ["$quantity", "$unitPrice"] } },
        },
      },
    ]);
    const soldMap = new Map<string, { sales30d: number; revenue30d: number }>(
      soldLast30.map((r: any) => [
        r._id.toString(),
        { sales30d: r.sales30d, revenue30d: r.revenue30d },
      ])
    );

    // Lấy sản phẩm có tồn kho >= 20 tại cơ sở của manager (hoặc toàn hệ thống)
    const inventoryMatchFilter: any = { deletedAt: null };
    if (facilityObjId) inventoryMatchFilter.facility = facilityObjId;

    const inventoryRows = await Inventory.aggregate([
      { $match: inventoryMatchFilter },
      { $group: { _id: "$product", totalStock: { $sum: "$quantity" } } },
      { $match: { totalStock: { $gte: 20 } } },
    ]);

    const slowProductIds: string[] = [];
    const stockData = new Map<string, number>();
    for (const row of inventoryRows) {
      const pid = row._id.toString();
      const s = soldMap.get(pid)?.sales30d ?? 0;
      if (s <= 3) {
        slowProductIds.push(pid);
        stockData.set(pid, row.totalStock);
      }
    }

    const slowProductQuery: any = { _id: { $in: slowProductIds }, isActive: true };
    if (query?.categoryId) {
      const { Types: SlowCatTypes } = await import("mongoose");
      slowProductQuery.categoryId = new SlowCatTypes.ObjectId(query.categoryId);
    }
    const slowProductDocs = await Product.find(slowProductQuery)
      .populate("category")
      .limit(10)
      .select("_id name categoryId category");

    const slowMovingProducts = slowProductDocs.map((p) => {
      const pid = p._id.toString();
      const soldInfo = soldMap.get(pid);
      return {
        productId: pid,
        name: p.name ?? "Sản phẩm không tên",
        categoryName: (p.category as any)?.name ?? "Không phân loại",
        currentStock: stockData.get(pid) ?? 0,
        sales30d: soldInfo?.sales30d ?? 0,
        revenue30d: soldInfo?.revenue30d ?? 0,
      };
    });

    // 6. Customer breakdown — lọc theo khách hàng đã mua tại cơ sở này
    const customerRole = await Role.findOne({ name: "customer" });

    let totalCust = 0;
    let newCust = 0;

    if (facilityObjId) {
      // Đếm khách hàng duy nhất đã đặt hàng tại cơ sở này
      const uniqueCustAgg = await Order.aggregate([
        {
          $match: {
            facility: facilityObjId,
            customerIdOrder: { $ne: null },
            deletedAt: null,
          },
        },
        { $group: { _id: "$customerIdOrder" } },
        { $count: "total" },
      ]);
      totalCust = uniqueCustAgg[0]?.total ?? 0;

      // Khách hàng mới (đăng ký trong 30 ngày) đã mua tại cơ sở
      if (customerRole) {
        const newCustIds = await Account.find({
          role: customerRole._id,
          deletedAt: null,
          createdAt: { $gte: thirtyDaysAgo },
        })
          .select("_id")
          .lean()
          .then((accounts) => accounts.map((a) => a._id));

        const newCustAgg = await Order.aggregate([
          {
            $match: {
              facility: facilityObjId,
              customerIdOrder: { $in: newCustIds },
              deletedAt: null,
            },
          },
          { $group: { _id: "$customerIdOrder" } },
          { $count: "total" },
        ]);
        newCust = newCustAgg[0]?.total ?? 0;
      }
    } else {
      // Tổng hệ thống
      if (customerRole) {
        [totalCust, newCust] = await Promise.all([
          Account.countDocuments({ role: customerRole._id, deletedAt: null }),
          Account.countDocuments({
            role: customerRole._id,
            deletedAt: null,
            createdAt: { $gte: thirtyDaysAgo },
          }),
        ]);
      }
    }

    const customerBreakdown = {
      total: totalCust,
      newLast30Days: newCust,
      returning: totalCust - newCust,
    };

    return {
      orderStatusBreakdown,
      revenueByFacility,
      revenueByCategory,
      topCustomers,
      slowMovingProducts,
      customerBreakdown,
    };
  }

  async getAdminDashboardData(query?: {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const timeRange = query?.timeRange || "30days";
    const now = new Date();
    const currentStart = new Date(now);
    const currentEnd = new Date(now);
    const prevStart = new Date(now);
    const prevEnd = new Date(now);

    if (timeRange === "today") {
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setHours(23, 59, 59, 999);

      prevStart.setDate(now.getDate() - 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(now.getDate() - 1);
      prevEnd.setHours(23, 59, 59, 999);
    } else if (timeRange === "7days") {
      currentStart.setDate(now.getDate() - 6);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setHours(23, 59, 59, 999);

      prevStart.setDate(now.getDate() - 13);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(now.getDate() - 7);
      prevEnd.setHours(23, 59, 59, 999);
    } else if (timeRange === "custom" && query?.startDate && query?.endDate) {
      // Khoảng thời gian tùy chọn do người dùng chọn.
      currentStart.setTime(new Date(query.startDate).getTime());
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setTime(new Date(query.endDate).getTime());
      currentEnd.setHours(23, 59, 59, 999);

      // Kỳ trước = khoảng liền kề có cùng độ dài để tính % tăng trưởng.
      const rangeMs = currentEnd.getTime() - currentStart.getTime();
      prevEnd.setTime(currentStart.getTime() - 1);
      prevStart.setTime(currentStart.getTime() - 1 - rangeMs);
    } else {
      // 30days
      currentStart.setDate(now.getDate() - 29);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd.setHours(23, 59, 59, 999);

      prevStart.setDate(now.getDate() - 59);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(now.getDate() - 30);
      prevEnd.setHours(23, 59, 59, 999);
    }

    // 1. KPI 1: Revenue & Growth %
    const [currentOrders, prevOrders] = await Promise.all([
      Order.find({
        orderAt: { $gte: currentStart, $lte: currentEnd },
        status: { $in: [OrderStatus.SUCCESSFUL, OrderStatus.DELIVERED] },
        deletedAt: null,
      }).lean(),
      Order.find({
        orderAt: { $gte: prevStart, $lte: prevEnd },
        status: { $in: [OrderStatus.SUCCESSFUL, OrderStatus.DELIVERED] },
        deletedAt: null,
      }).lean(),
    ]);

    const currentOrderIds = currentOrders.map((o) => o._id);
    const prevOrderIds = prevOrders.map((o) => o._id);

    const [currentPaidInvoices, prevPaidInvoices] = await Promise.all([
      Invoice.find({
        order: { $in: currentOrderIds },
        status: InvoiceStatus.PAID,
        deletedAt: null,
      }).lean(),
      Invoice.find({
        order: { $in: prevOrderIds },
        status: InvoiceStatus.PAID,
        deletedAt: null,
      }).lean(),
    ]);

    const currentPaidOrderIds = new Set(currentPaidInvoices.map((inv) => inv.order.toString()));
    const prevPaidOrderIds = new Set(prevPaidInvoices.map((inv) => inv.order.toString()));

    const currentNetRevenueOrders = currentOrders.filter((o) => currentPaidOrderIds.has(o._id.toString()));
    const prevNetRevenueOrders = prevOrders.filter((o) => prevPaidOrderIds.has(o._id.toString()));

    const totalRevenue = currentNetRevenueOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount || 0),
      0
    );
    const prevRevenue = prevNetRevenueOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount || 0),
      0
    );

    let growthPercentage = 0;
    if (prevRevenue > 0) {
      growthPercentage = ((totalRevenue - prevRevenue) / prevRevenue) * 100;
    } else if (totalRevenue > 0) {
      growthPercentage = 100;
    }

    // 2. KPI 2: Orders Count
    const totalNewOrders = await Order.countDocuments({
      orderAt: { $gte: currentStart, $lte: currentEnd },
      deletedAt: null,
    });
    const pendingOrders = await Order.countDocuments({
      status: OrderStatus.PENDING,
      deletedAt: null,
    });
    const completedOrders = currentNetRevenueOrders.length;

    // 3. KPI 3: New Customers
    const customerRole = await Role.findOne({ name: "customer" });
    const newCustomers = customerRole
      ? await Account.countDocuments({
        role: customerRole._id,
        createdAt: { $gte: currentStart, $lte: currentEnd },
        deletedAt: null,
      })
      : 0;

    // 4. Low Stock Products & Low Stock Warning List
    const activeFacilities = await Facility.find({ isActive: true }).lean();
    const activeFacilityIds = activeFacilities.map((f) => f._id.toString());

    // Replicate exactly the inventory logic to handle multiple records correctly
    const inventories = await Inventory.find({ deletedAt: null }).lean();
    const inventoryMap = new Map<string, Map<string, number>>();
    for (const inv of inventories) {
      const pId = inv.product.toString();
      const fId = inv.facility.toString();
      if (!inventoryMap.has(pId)) {
        inventoryMap.set(pId, new Map());
      }
      inventoryMap.get(pId)!.set(fId, inv.quantity || 0);
    }

    const activeProducts = await Product.find({ isActive: true, deletedAt: null })
      .populate("category")
      .lean();

    const getProductSku = (product: any): string => {
      if (typeof product.sku === "string" && product.sku.trim()) {
        return product.sku;
      }
      const prefix = product.category?.slug?.slice(0, 3) || product.slug?.slice(0, 3) || "prd";
      return `${prefix}-${product._id.toString().slice(0, 8)}`.toUpperCase();
    };

    const lowStockWarningList: { productCode: string; productName: string; currentStock: number; minimumStockThreshold: number }[] = [];

    for (const prod of activeProducts) {
      const prodId = prod._id.toString();
      const prodInventories = inventoryMap.get(prodId) || new Map<string, number>();

      let totalStock = 0;
      for (const facId of activeFacilityIds) {
        totalStock += prodInventories.get(facId) ?? 0;
      }

      if (totalStock > 0 && totalStock < 30) {
        lowStockWarningList.push({
          productCode: getProductSku(prod),
          productName: prod.name || "",
          currentStock: totalStock,
          minimumStockThreshold: 30,
        });
      }
    }

    const lowStockProductsCount = lowStockWarningList.length;

    // 5. Revenue Trend Chart
    const trendMap = new Map<string, number>();
    const trendLabels: { key: string; label: string }[] = [];

    if (timeRange === "today") {
      for (let h = 0; h < 24; h++) {
        const key = String(h).padStart(2, "0");
        const label = `${key}:00`;
        trendLabels.push({ key, label });
        trendMap.set(key, 0);
      }

      for (const o of currentNetRevenueOrders) {
        const hourStr = String(new Date(o.orderAt).getHours()).padStart(2, "0");
        if (trendMap.has(hourStr)) {
          trendMap.set(hourStr, trendMap.get(hourStr)! + Number(o.totalAmount || 0));
        }
      }
    } else {
      const temp = new Date(currentStart);
      while (temp <= currentEnd) {
        const year = temp.getFullYear();
        const month = String(temp.getMonth() + 1).padStart(2, "0");
        const day = String(temp.getDate()).padStart(2, "0");
        const key = `${year}-${month}-${day}`;
        const label = `${day}/${month}`;
        trendLabels.push({ key, label });
        trendMap.set(key, 0);
        temp.setDate(temp.getDate() + 1);
      }

      for (const o of currentNetRevenueOrders) {
        const orderDate = new Date(o.orderAt);
        const year = orderDate.getFullYear();
        const month = String(orderDate.getMonth() + 1).padStart(2, "0");
        const day = String(orderDate.getDate()).padStart(2, "0");
        const key = `${year}-${month}-${day}`;
        if (trendMap.has(key)) {
          trendMap.set(key, trendMap.get(key)! + Number(o.totalAmount || 0));
        }
      }
    }

    const revenueTrend = trendLabels.map(({ key, label }) => ({
      label,
      revenue: trendMap.get(key) ?? 0,
    }));

    // 6. Order Status Chart
    const orders = await Order.find({
      orderAt: { $gte: currentStart, $lte: currentEnd },
      deletedAt: null,
    }).lean();

    let pendingCount = 0;
    let shippingCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    for (const o of orders) {
      const status = o.status;
      if (status === OrderStatus.PENDING || status === OrderStatus.PROCESSING) {
        pendingCount++;
      } else if (status === OrderStatus.SHIPPING || status === OrderStatus.DELIVERY_FAILED) {
        shippingCount++;
      } else if (status === OrderStatus.DELIVERED || status === OrderStatus.SUCCESSFUL) {
        completedCount++;
      } else if (status === OrderStatus.CANCELLED) {
        cancelledCount++;
      }
    }

    const orderStatusDistribution = [
      { status: "Chờ xử lý", count: pendingCount },
      { status: "Đang giao", count: shippingCount },
      { status: "Đã giao", count: completedCount },
      { status: "Đã hủy", count: cancelledCount },
    ];

    // 7. Branch Revenue Ranking
    const facilityRevenueRaw = await Order.aggregate([
      {
        $match: {
          status: { $in: [OrderStatus.SUCCESSFUL, OrderStatus.DELIVERED] },
          orderAt: { $gte: currentStart, $lte: currentEnd },
          deletedAt: null,
        },
      },
      {
        $group: {
          _id: "$facility",
          revenue: { $sum: "$totalAmount" },
        },
      },
    ]);

    const revenueMap = new Map<string, number>(
      facilityRevenueRaw.map((r: any) => [r._id ? r._id.toString() : "null", r.revenue])
    );

    const facilities = await Facility.find({ isActive: true });
    const branchRevenue = facilities.map((fac) => {
      const facId = fac._id.toString();
      return {
        branchName: fac.name || "Chi nhánh không tên",
        revenue: revenueMap.get(facId) ?? 0,
      };
    });
    branchRevenue.sort((a, b) => b.revenue - a.revenue);

    // 8. Top 5 Best-Selling Products
    const completedOrdersQuery = await Order.find({
      status: { $in: [OrderStatus.SUCCESSFUL, OrderStatus.DELIVERED] },
      orderAt: { $gte: currentStart, $lte: currentEnd },
      deletedAt: null,
    })
      .select("_id")
      .lean();

    const completedOrderIds = completedOrdersQuery.map((o) => o._id);
    let topBestSellingProducts: { productName: string; quantitySold: number; totalRevenue: number }[] = [];
    if (completedOrderIds.length > 0) {
      const rawProducts = await OrderDetail.aggregate([
        { $match: { order: { $in: completedOrderIds }, deletedAt: null } },
        {
          $lookup: {
            from: "products",
            localField: "product",
            foreignField: "_id",
            as: "productDoc",
          },
        },
        { $unwind: { path: "$productDoc", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$product",
            productName: { $first: "$productDoc.name" },
            quantitySold: { $sum: "$quantity" },
            totalRevenue: { $sum: { $multiply: ["$quantity", "$unitPrice"] } },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
      ]);

      topBestSellingProducts = rawProducts.map((r) => ({
        productName: r.productName || "Sản phẩm không xác định",
        quantitySold: Number(r.quantitySold || 0),
        totalRevenue: Number(r.totalRevenue || 0),
      }));
    }

    return {
      kpis: {
        revenue: {
          total: totalRevenue,
          growthPercentage,
        },
        orders: {
          totalNew: totalNewOrders,
          pending: pendingOrders,
          completed: completedOrders,
        },
        newCustomers,
        lowStockProductsCount,
      },
      revenueTrend,
      orderStatusDistribution,
      branchRevenue,
      topBestSellingProducts,
      lowStockWarningList,
    };
  }
}

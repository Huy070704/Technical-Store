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

@Service()
export class StatisticService {
  async getDashboardStatistics() {
    // 1. Basic Counts
    const totalProducts = await Product.countDocuments({ isActive: true });

    // Tồn kho nay nằm ở bảng Inventory (cộng quantity mọi facility theo product).
    const LOW_STOCK_THRESHOLD = 10;
    const activeProducts = await Product.find({ isActive: true }).select("_id");
    const stockRows = await Inventory.aggregate([
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

    const totalOrders = await Order.countDocuments();

    // 2. Financial Metrics
    const paidInvoices = await Invoice.find({ status: InvoiceStatus.PAID });
    const dbGrossRevenue = paidInvoices.reduce(
      (sum, inv) => sum + Number(inv.totalAmount || 0),
      0
    );

    const grossRevenue = dbGrossRevenue;
    const netProfit = grossRevenue * 0.35; // 35% estimated profit margin
    const avgOrderValue = paidInvoices.length
      ? dbGrossRevenue / paidInvoices.length
      : 0;

    const returnedCount = await Order.countDocuments({
      status: OrderStatus.RETURNED,
    });
    const returnRate = totalOrders
      ? Number(((returnedCount / totalOrders) * 100).toFixed(1))
      : 0;

    const conversionRate = totalOrders > 0 && totalCustomers > 0
      ? Number(((totalOrders / totalCustomers) * 100).toFixed(2))
      : 0;

    // 3. Top Performing Products
    const topProductsRaw = await OrderDetail.aggregate([
      { $match: { deletedAt: null } },
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

    // 4. Payment Distribution
    const paymentMethodsRaw = await Invoice.aggregate([
      { $match: { status: InvoiceStatus.PAID, deletedAt: null } },
      { $group: { _id: "$paymentMethod", count: { $sum: 1 } } },
    ]);

    let paymentDistribution = paymentMethodsRaw.map((row) => ({
      method: row._id || "Other",
      count: Number(row.count || 0),
      percentage: 0,
    }));

    const totalPaidInvoices = paidInvoices.length;
    if (totalPaidInvoices > 0) {
      paymentDistribution.forEach((p) => {
        p.percentage = Math.round((p.count / totalPaidInvoices) * 100);
      });
    }

    // 5. Recent High Value Transactions
    const recentInvoices = await Invoice.find()
      .populate({ path: "order", populate: { path: "customerIdOrder" } })
      .sort({ paidAt: -1 })
      .limit(5);

    const recentTransactions = recentInvoices.map((inv) => ({
      id: `#TX-${inv.invoiceNumber || inv.id.slice(0, 6).toUpperCase()}`,
      entity: (inv.order as any)?.customerIdOrder?.name || (inv.order as any)?.guestName || "Guest Customer",
      status: inv.status === InvoiceStatus.PAID ? "Settled" : "Pending",
      amount: Number(inv.totalAmount || 0),
    }));

    // 6. Real Revenue Trend (30 ngày qua) — lấy từ Invoice PAID
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 59);

    const [currentPeriodInvoices, previousPeriodInvoices] = await Promise.all([
      Invoice.aggregate([
        {
          $match: {
            status: InvoiceStatus.PAID,
            paidAt: { $gte: thirtyDaysAgo, $lte: today },
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]),
      Invoice.aggregate([
        {
          $match: {
            status: InvoiceStatus.PAID,
            paidAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
            revenue: { $sum: "$totalAmount" },
          },
        },
      ]),
    ]);

    const currentMap = new Map<string, number>(
      currentPeriodInvoices.map((r: any) => [r._id as string, r.revenue as number])
    );
    const prevMap = new Map<string, number>(
      previousPeriodInvoices.map((r: any) => [r._id as string, r.revenue as number])
    );

    const revenueTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      // Ngày tương ứng kỳ trước (cách 30 ngày)
      const prevDate = new Date(date);
      prevDate.setDate(prevDate.getDate() - 30);
      const prevKey = prevDate.toISOString().split("T")[0];
      const dateString = date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
      revenueTrend.push({
        date: dateString,
        current: currentMap.get(dateKey) ?? 0,
        previous: prevMap.get(prevKey) ?? 0,
      });
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
      returnRate,
      topProducts,
      paymentDistribution,
      recentTransactions,
      revenueTrend,
    };
  }

  async exportSalesReport(res: Response) {
    const stats = await this.getDashboardStatistics();

    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Overview
    const wsOverview = workbook.addWorksheet("Business Overview");
    wsOverview.columns = [
      { header: "Metric Name", key: "metric", width: 30 },
      { header: "Value", key: "value", width: 25 },
    ];

    wsOverview.addRows([
      { metric: "Gross Revenue", value: `$${stats.grossRevenue.toLocaleString()}` },
      { metric: "Net Profit", value: `$${stats.netProfit.toLocaleString()}` },
      { metric: "Average Order Value", value: `$${stats.avgOrderValue.toFixed(2)}` },
      { metric: "Conversion Rate", value: `${stats.conversionRate}%` },
      { metric: "Total Orders", value: stats.totalOrders },
      { metric: "Total Customers", value: stats.totalCustomers },
      { metric: "Total Active Products", value: stats.totalProducts },
      { metric: "Low Stock Items", value: stats.lowStockItems },
      { metric: "Out of Stock Items", value: stats.outOfStockItems },
      { metric: "Return Rate", value: `${stats.returnRate}%` },
    ]);

    wsOverview.getRow(1).font = { bold: true };

    // Sheet 2: Top Products
    const wsProducts = workbook.addWorksheet("Top Products");
    wsProducts.columns = [
      { header: "Rank", key: "rank", width: 10 },
      { header: "Product Name", key: "name", width: 35 },
      { header: "Revenue ($)", key: "revenue", width: 20 },
      { header: "Quantity Sold", key: "quantity", width: 15 },
      { header: "Growth", key: "growth", width: 15 },
    ];

    stats.topProducts.forEach((p) => {
      wsProducts.addRow({
        rank: p.rank,
        name: p.name,
        revenue: p.revenue,
        quantity: p.quantity,
        growth: p.growth,
      });
    });
    wsProducts.getRow(1).font = { bold: true };

    // Sheet 3: Recent Transactions
    const wsTransactions = workbook.addWorksheet("Recent Transactions");
    wsTransactions.columns = [
      { header: "Transaction ID", key: "id", width: 20 },
      { header: "Customer / Entity", key: "entity", width: 30 },
      { header: "Status", key: "status", width: 15 },
      { header: "Amount ($)", key: "amount", width: 20 },
    ];

    stats.recentTransactions.forEach((tx) => {
      wsTransactions.addRow({
        id: tx.id,
        entity: tx.entity,
        status: tx.status,
        amount: tx.amount,
      });
    });
    wsTransactions.getRow(1).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=sales-report.xlsx");
    await workbook.xlsx.write(res);
    res.end();
    return res;
  }

  async getManagerDetailedStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Order status breakdown — đếm thực từ DB
    const statusCounts = await Order.aggregate([
      { $match: { deletedAt: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const statusMap = new Map<string, number>(
      statusCounts.map((r: any) => [r._id as string, r.count as number])
    );
    const totalOrders = Array.from(statusMap.values()).reduce((a, b) => a + b, 0);
    const orderStatusBreakdown = {
      total: totalOrders,
      pending: statusMap.get(OrderStatus.PENDING) ?? 0,
      assigned: statusMap.get(OrderStatus.ASSIGNED) ?? 0,
      processing: statusMap.get(OrderStatus.PROCESSING) ?? 0,
      shipping: statusMap.get(OrderStatus.SHIPPING) ?? 0,
      delivered: statusMap.get(OrderStatus.DELIVERED) ?? 0,
      deliveryFailed: statusMap.get(OrderStatus.DELIVERY_FAILED) ?? 0,
      cancelled: statusMap.get(OrderStatus.CANCELLED) ?? 0,
      returned: statusMap.get(OrderStatus.RETURNED) ?? 0,
      successful: statusMap.get(OrderStatus.SUCCESSFUL) ?? 0,
    };

    // 2. Revenue by Facility — join Order → Invoice → Facility
    const facilityRevenueRaw = await Invoice.aggregate([
      { $match: { status: InvoiceStatus.PAID, deletedAt: null } },
      {
        $lookup: {
          from: "orders",
          localField: "order",
          foreignField: "_id",
          as: "order",
        },
      },
      { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } },
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

    // 3. Revenue by Category — join OrderDetail → Product → Category
    const categoryRevenueRaw = await OrderDetail.aggregate([
      { $match: { deletedAt: null } },
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

    // 4. Top purchasing customers — group Order theo customerIdOrder
    const topCustomersRaw = await Order.aggregate([
      {
        $match: {
          customerIdOrder: { $ne: null },
          status: { $in: [OrderStatus.SUCCESSFUL, OrderStatus.DELIVERED] },
          deletedAt: null,
        },
      },
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

    // 5. Slow-moving products — tồn kho cao, doanh số 30 ngày thấp
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
      {
        $match: {
          "order.orderAt": { $gte: thirtyDaysAgo },
          deletedAt: null,
        },
      },
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

    // Lấy sản phẩm có tồn kho >= 20 và doanh số 30 ngày thấp (<=3)
    const inventoryRows = await Inventory.aggregate([
      { $match: { deletedAt: null } },
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

    const slowProductDocs = await Product.find({ _id: { $in: slowProductIds }, isActive: true })
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

    // 6. Customer breakdown: new (đăng ký <= 30 ngày) vs returning
    const customerRole = await Role.findOne({ name: "customer" });
    const [totalCust, newCust] = customerRole
      ? await Promise.all([
          Account.countDocuments({ role: customerRole._id, deletedAt: null }),
          Account.countDocuments({
            role: customerRole._id,
            deletedAt: null,
            createdAt: { $gte: thirtyDaysAgo },
          }),
        ])
      : [0, 0];

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
}

import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, describe, it, beforeEach } from "node:test";
import { Types } from "mongoose";
import { StatisticService } from "../src/modules/statistics/services/statistic.service";
import { Product } from "../src/modules/product/models/product.model";
import { Inventory } from "../src/modules/inventory/models/inventory.model";
import { Role } from "../src/modules/auth/models/role.model";
import { Account } from "../src/modules/auth/models/account.model";
import { Order, OrderStatus } from "../src/modules/order/models/order.model";
import { OrderDetail } from "../src/modules/order/models/orderDetail.model";
import { Invoice } from "../src/modules/payment/models/invoice.model";

const queryResult = <T>(value: T) => {
  const query: any = {
    select() { return query; },
    populate() { return query; },
    sort() { return query; },
    limit() { return query; },
    lean() { return Promise.resolve(value); },
    then(resolve: (result: T) => unknown, reject: (error: unknown) => unknown) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
  return query;
};

describe("Admin - StatisticService", () => {
  const originals = {
    ProductCount: Product.countDocuments,
    ProductFind: Product.find,
    InventoryAgg: Inventory.aggregate,
    RoleFindOne: Role.findOne,
    AccountCount: Account.countDocuments,
    OrderCount: Order.countDocuments,
    OrderFind: Order.find,
    OrderDetailAgg: OrderDetail.aggregate,
    OrderDetailFind: OrderDetail.find,
    InvoiceFind: Invoice.find,
  };

  beforeEach(() => {
    const mockOrderId = new Types.ObjectId();
    
    // Mocks cơ bản để getDashboardStatistics chạy không bị lỗi
    Product.countDocuments = (() => queryResult(120)) as unknown as typeof Product.countDocuments;
    Product.find = (() => queryResult([{ _id: new Types.ObjectId() }])) as unknown as typeof Product.find;
    Inventory.aggregate = (async () => []) as unknown as typeof Inventory.aggregate;
    Role.findOne = (() => queryResult({ _id: new Types.ObjectId(), name: "customer" })) as unknown as typeof Role.findOne;
    Account.countDocuments = (() => queryResult(500)) as unknown as typeof Account.countDocuments;
    Order.countDocuments = (() => queryResult(1000)) as unknown as typeof Order.countDocuments;
    
    Order.find = (() => queryResult([
      { _id: mockOrderId, orderAt: new Date(), orderType: 1, totalAmount: 500000, status: OrderStatus.SUCCESSFUL, paymentMethod: "TRANSFER" }
    ])) as unknown as typeof Order.find;
    
    OrderDetail.aggregate = (async () => [
      { _id: null, total: 20000000 } // grossRevenue = 20M
    ]) as unknown as typeof OrderDetail.aggregate;
    
    OrderDetail.find = (() => queryResult([])) as unknown as typeof OrderDetail.find;
    
    Invoice.find = (() => queryResult([
      { id: "abcdef", order: mockOrderId, status: "paid" }
    ])) as unknown as typeof Invoice.find;
  });

  afterEach(() => {
    Product.countDocuments = originals.ProductCount;
    Product.find = originals.ProductFind;
    Inventory.aggregate = originals.InventoryAgg;
    Role.findOne = originals.RoleFindOne;
    Account.countDocuments = originals.AccountCount;
    Order.countDocuments = originals.OrderCount;
    Order.find = originals.OrderFind;
    OrderDetail.aggregate = originals.OrderDetailAgg;
    OrderDetail.find = originals.OrderDetailFind;
    Invoice.find = originals.InvoiceFind;
  });

  it("getDashboardStatistics - trả về đúng các KPI cơ bản", async () => {
    const service = new StatisticService();
    const result = await service.getDashboardStatistics(null, { timeRange: "30days" });

    assert.equal(result.totalProducts, 120);
    assert.equal(result.totalCustomers, 500);
    assert.equal(result.totalOrders, 1000);
    assert.equal(result.grossRevenue, 20000000); // Từ OrderDetail.aggregate mock
    assert.equal(result.netProfit, 20000000 * 0.35); // 35% margin
    assert.equal(result.conversionRate, 200); // 1000 orders / 500 customers * 100
  });

  it("getRevenueStatistics - thống kê doanh thu hợp lệ", async () => {
    const service = new StatisticService();
    const result = await service.getRevenueStatistics({ timeRange: "today" });

    assert.equal(result.kpis.successfulOrderCount, 1);
    assert.equal(result.kpis.grossRevenue, 500000);
  });
  
  it("exportSalesReport - khởi tạo workbook thành công", async () => {
    const service = new StatisticService();
    const workbook = await service.exportSalesReport(null, { timeRange: "today" });
    
    assert.ok(workbook);
    assert.equal(typeof workbook.addWorksheet, "function");
    const ws = (workbook as any).getWorksheet("Business Overview");
    assert.ok(ws);
  });
});

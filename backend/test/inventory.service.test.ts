import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, describe, it, beforeEach } from "node:test";
import { Types } from "mongoose";
import { InventoryService } from "../src/modules/inventory/services/inventory.service";
import { Facility } from "../src/modules/facility/models/facility.model";
import { Product } from "../src/modules/product/models/product.model";
import { Category } from "../src/modules/product/models/category.model";
import { Inventory } from "../src/modules/inventory/models/inventory.model";
import { Account } from "../src/modules/auth/models/account.model";

const queryResult = <T>(value: T) => {
  const query: any = {
    setOptions() { return query; },
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

describe("Admin - InventoryService", () => {
  const originals = {
    FacilityFind: Facility.find,
    FacilityFindById: Facility.findById,
    ProductFind: Product.find,
    CategoryFind: Category.find,
    InventoryFind: Inventory.find,
    InventoryCount: Inventory.countDocuments,
    InventoryFindOne: Inventory.findOne,
    AccountFindById: Account.findById,
  };

  const fId1 = new Types.ObjectId();
  const fId2 = new Types.ObjectId();
  const pId1 = new Types.ObjectId();
  const pId2 = new Types.ObjectId();

  beforeEach(() => {
    // Mock Inventory count documents >= so ensureInventoryData won't run
    Inventory.countDocuments = (() => queryResult(100)) as unknown as typeof Inventory.countDocuments;
    
    Facility.find = (() => queryResult([
      { _id: fId1, name: "Facility 1", isActive: true },
      { _id: fId2, name: "Facility 2", isActive: true }
    ])) as unknown as typeof Facility.find;

    Category.find = (() => queryResult([])) as unknown as typeof Category.find;

    Product.find = (() => queryResult([
      { _id: pId1, name: "Laptop", sku: "LAP-01", price: 1000, isActive: true },
      { _id: pId2, name: "Mouse", sku: "MOU-01", price: 20, isActive: true }
    ])) as unknown as typeof Product.find;

    // Inventory data:
    // LAP-01 in Facility 1 = 5 (Low Stock globally since 5 < 30)
    // LAP-01 in Facility 2 = 0
    // MOU-01 in Facility 1 = 0 
    // MOU-01 in Facility 2 = 50 (Stable stock)
    Inventory.find = (() => queryResult([
      { product: pId1, facility: fId1, quantity: 5 },
      { product: pId1, facility: fId2, quantity: 0 },
      { product: pId2, facility: fId1, quantity: 0 },
      { product: pId2, facility: fId2, quantity: 50 },
    ])) as unknown as typeof Inventory.find;
  });

  afterEach(() => {
    Facility.find = originals.FacilityFind;
    Facility.findById = originals.FacilityFindById;
    Product.find = originals.ProductFind;
    Category.find = originals.CategoryFind;
    Inventory.find = originals.InventoryFind;
    Inventory.countDocuments = originals.InventoryCount;
    Inventory.findOne = originals.InventoryFindOne;
    Account.findById = originals.AccountFindById;
  });

  it("getInventoryReport - tạo báo cáo kho toàn hệ thống chính xác", async () => {
    const service = new InventoryService();
    const result = await service.getInventoryReport({ page: 1, limit: 10 });

    assert.equal(result.items.length, 2);
    
    // Sort by default is ASC name: Laptop -> Mouse
    const laptop = result.items.find(i => i.id === pId1.toString());
    const mouse = result.items.find(i => i.id === pId2.toString());
    
    assert.ok(laptop);
    assert.ok(mouse);

    assert.equal(laptop.totalStock, 5); // 5 + 0
    assert.equal(laptop.status, "Low Stock"); // < 30
    
    assert.equal(mouse.totalStock, 50); // 0 + 50
    assert.equal(mouse.status, "Stable");

    // KPI check
    assert.equal(result.kpis.lowStockAlerts, 1); // Laptop
    assert.equal(result.kpis.outOfStockCount, 0);
  });

  it("getInventoryReport - lọc báo cáo theo cơ sở (facilityId)", async () => {
    const service = new InventoryService();
    // Filter for Facility 1
    const result = await service.getInventoryReport({ facilityId: fId1.toString() });

    const laptop = result.items.find(i => i.id === pId1.toString());
    const mouse = result.items.find(i => i.id === pId2.toString());
    
    assert.ok(laptop);
    assert.ok(mouse);

    // Laptop in Facility 1 has 5 stock -> Low Stock (since < 10 threshold for specific facility)
    assert.equal(laptop.totalStock, 5);
    assert.equal(laptop.status, "Low Stock");

    // Mouse in Facility 1 has 0 stock -> Out of Stock
    assert.equal(mouse.totalStock, 0);
    assert.equal(mouse.status, "Out of Stock");
  });

  it("exportInventoryReport - tạo workbook xuất excel", async () => {
    const service = new InventoryService();
    const workbook = await service.exportInventoryReport({}, null);
    assert.ok(workbook);
    assert.equal(typeof (workbook as any).addWorksheet, "function");
  });

  it("adjustStock - thực hiện xuất kho (subtract) thành công", async () => {
    const service = new InventoryService();
    
    // Tạo dummy mock cho inventory.save() và product.save()
    let savedInventoryQty = 5;
    let productIsActive = true;
    
    Inventory.findOne = (() => queryResult({
      product: pId1,
      facility: fId1,
      quantity: 5,
      save: async function() { savedInventoryQty = this.quantity; }
    })) as unknown as typeof Inventory.findOne;

    Inventory.aggregate = (async () => [{ _id: null, total: 3 }]) as unknown as typeof Inventory.aggregate;

    Product.findOne = (() => queryResult({
      _id: pId1,
      name: "Laptop",
      isActive: true,
      save: async function() { productIsActive = this.isActive; }
    })) as unknown as typeof Product.findOne;
    
    Account.findById = (() => queryResult({
      _id: new Types.ObjectId(),
      facility: fId1
    })) as unknown as typeof Account.findById;

    Facility.findOne = (() => queryResult({
      _id: fId1,
      name: "Facility 1",
      isActive: true
    })) as unknown as typeof Facility.findOne;

    const result = await service.adjustStock("dummy-account-id", {
      productId: pId1.toString(),
      facilityId: fId1.toString(),
      mode: "subtract",
      quantity: 2,
      reason: "Xuất kho bán lẻ"
    });

    assert.equal(result.previousQuantity, 5);
    assert.equal(result.newQuantity, 3);
    assert.equal(result.mode, "subtract");
    assert.equal(savedInventoryQty, 3); // Đã update vào database mock
  });

  it("getInventoryReport - hiển thị sản phẩm ngừng kinh doanh (Archived)", async () => {
    const service = new InventoryService();
    const pIdArchived = new Types.ObjectId();

    Product.find = (() => queryResult([
      { _id: pId1, name: "Laptop", sku: "LAP-01", price: 1000, isActive: true },
      { _id: pIdArchived, name: "Old Laptop", sku: "LAP-OLD", price: 500, isActive: false }
    ])) as unknown as typeof Product.find;

    Inventory.find = (() => queryResult([
      { product: pId1, facility: fId1, quantity: 10 },
      { product: pIdArchived, facility: fId1, quantity: 2 }
    ])) as unknown as typeof Inventory.find;

    const reportAll = await service.getInventoryReport({});
    const archivedItem = reportAll.items.find(i => i.id === pIdArchived.toString());
    assert.ok(archivedItem);
    assert.equal(archivedItem.status, "Archived");

    const reportArchivedFilter = await service.getInventoryReport({ status: "archived" });
    assert.equal(reportArchivedFilter.items.length, 1);
    assert.equal(reportArchivedFilter.items[0].id, pIdArchived.toString());
  });
});

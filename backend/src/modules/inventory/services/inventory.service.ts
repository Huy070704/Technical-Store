import { Service } from "typedi";
import { Inventory } from "../models/inventory.model";
import { Product } from "../../product/models/product.model";
import { Facility } from "../../facility/models/facility.model";
import { Category } from "../../product/models/category.model";
import { Account } from "../../auth/models/account.model";
import ExcelJS from "exceljs";
import { BadRequestException, EntityNotFoundException } from "@/shared/exceptions/http-exceptions";

export interface InventoryReportQueryDto {
  facilityId?: string;
  categoryId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export type StockAdjustmentMode = "set" | "add" | "subtract";

export interface AdjustStockDto {
  productId: string;
  facilityId: string;
  mode: StockAdjustmentMode;
  quantity: number;
  reason?: string;
}

@Service()
export class InventoryService {
  async ensureInventoryData(): Promise<void> {
    const facilities = await Facility.find({ isActive: true });
    const products = await Product.find({ isActive: true });
    const count = await Inventory.countDocuments();

    if (count < facilities.length * products.length) {
      console.log("🌱 Seeding mock inventory data...");
      for (const facility of facilities) {
        for (const product of products) {
          const existing = await Inventory.findOne({
            facility: facility._id,
            product: product._id,
          });

          if (!existing) {
            const rand = Math.random();
            let quantity = 0;
            if (rand > 0.85) {
              quantity = 0; // Out of stock (15%)
            } else if (rand > 0.65) {
              quantity = Math.floor(Math.random() * 9) + 1; // Low stock (1-9) (20%)
            } else {
              quantity = Math.floor(Math.random() * 150) + 15; // Stable stock (15-165) (65%)
            }

            await Inventory.create({
              facility: facility._id,
              product: product._id,
              quantity,
              minimumStockLevel: 10,
            });
          }
        }
      }
      console.log("✅ Seeding mock inventory completed.");
    }
  }

  private getProductSku(product: any): string {
    if (typeof product.sku === "string" && product.sku.trim()) {
      return product.sku;
    }
    const prefix = product.category?.slug?.slice(0, 3) || product.slug?.slice(0, 3) || "prd";
    return `${prefix}-${product._id.toString().slice(0, 8)}`.toUpperCase();
  }

  async getInventoryReport(query: InventoryReportQueryDto) {
    await this.ensureInventoryData();

    const facilityId = query.facilityId || "all";
    const categoryId = query.categoryId || "all";
    const status = query.status || "all";
    const search = (query.search || "").trim().toLowerCase();
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 10));
    const sortBy = query.sortBy || "name";
    const sortOrder = query.sortOrder || "asc";

    // 1. Fetch facilities & categories to build metadata and mappings
    const allFacilities = await Facility.find({ isActive: true });
    const allCategories = await Category.find({ deletedAt: null });

    // 2. Fetch products populated with categories
    const products = await Product.find({ isActive: true, deletedAt: null })
      .populate("category");

    // 3. Fetch all inventories
    const inventories = await Inventory.find().lean();

    // Group inventories by product & facility
    const inventoryMap = new Map<string, Map<string, number>>(); // productId -> facilityId -> quantity
    for (const inv of inventories) {
      const pId = inv.product.toString();
      const fId = inv.facility.toString();
      if (!inventoryMap.has(pId)) {
        inventoryMap.set(pId, new Map());
      }
      inventoryMap.get(pId)!.set(fId, inv.quantity);
    }

    // 4. Map products to inventory list items
    let list = products.map((prod) => {
      const sku = this.getProductSku(prod);
      const prodId = prod._id.toString();
      const prodInventories = inventoryMap.get(prodId) || new Map<string, number>();

      // Build facility breakdown
      let breakdown = allFacilities.map((fac) => {
        const facId = fac._id.toString();
        const stock = prodInventories.get(facId) ?? 0;
        return {
          facilityId: facId,
          facilityName: fac.name || "",
          stock,
        };
      });

      if (facilityId !== "all") {
        breakdown = breakdown.filter((b) => b.facilityId === facilityId);
      }

      // Calculate total stock based on facility selection
      let totalStock = 0;
      if (facilityId === "all") {
        totalStock = breakdown.reduce((sum, item) => sum + item.stock, 0);
      } else {
        totalStock = prodInventories.get(facilityId) ?? 0;
      }

      const unitPrice = Number(prod.price || 0);
      const totalValue = totalStock * unitPrice;

      // Status logic:
      let stockStatus: "Stable" | "Low Stock" | "Out of Stock" = "Stable";
      if (totalStock === 0) {
        stockStatus = "Out of Stock";
      } else if (facilityId === "all") {
        if (totalStock < 30) {
          stockStatus = "Low Stock";
        }
      } else {
        // For specific facility, check if stock is below minimum level (default 10)
        if (totalStock < 10) {
          stockStatus = "Low Stock";
        }
      }

      return {
        id: prodId,
        sku,
        name: prod.name || "",
        categoryId: prod.categoryId?.toString() || "",
        categoryName: prod.category?.name || "Khác",
        totalStock,
        breakdown,
        unitPrice,
        totalValue,
        status: stockStatus,
      };
    });

    // 5. Apply filters
    if (categoryId !== "all") {
      list = list.filter((item) => item.categoryId === categoryId);
    }

    if (search) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          item.sku.toLowerCase().includes(search)
      );
    }

    if (status !== "all") {
      list = list.filter((item) => {
        if (status === "stable") return item.status === "Stable";
        if (status === "low_stock") return item.status === "Low Stock";
        if (status === "out_of_stock") return item.status === "Out of Stock";
        return true;
      });
    }

    // 6. Calculate KPIs
    const totalInventoryValue = list.reduce((sum, item) => sum + item.totalValue, 0);
    const lowStockAlerts = list.filter((item) => item.status === "Low Stock").length;
    const outOfStockCount = list.filter((item) => item.status === "Out of Stock").length;

    // Calculate Highest and Lowest stock facilities
    const facilityStockMap = new Map<string, number>();
    for (const fac of allFacilities) {
      facilityStockMap.set(fac._id.toString(), 0);
    }
    for (const prod of products) {
      const prodId = prod._id.toString();
      const prodInventories = inventoryMap.get(prodId) || new Map<string, number>();
      for (const [fId, qty] of prodInventories.entries()) {
        if (facilityStockMap.has(fId)) {
          facilityStockMap.set(fId, facilityStockMap.get(fId)! + qty);
        }
      }
    }

    const targetFacilities = facilityId === "all" 
      ? allFacilities 
      : allFacilities.filter((f) => f._id.toString() === facilityId);

    let highestStockFacility = { name: "N/A", stock: 0 };
    let lowestStockFacility = { name: "N/A", stock: Infinity };

    for (const fac of targetFacilities) {
      const facId = fac._id.toString();
      const stock = facilityStockMap.get(facId) || 0;
      if (stock > highestStockFacility.stock) {
        highestStockFacility = { name: fac.name || "N/A", stock };
      }
      if (stock < lowestStockFacility.stock) {
        lowestStockFacility = { name: fac.name || "N/A", stock };
      }
    }
    if (lowestStockFacility.stock === Infinity) {
      lowestStockFacility = { name: "N/A", stock: 0 };
    }

    // Unusual Activities derived from real data
    const alertItems = list.filter((item) => item.status === "Out of Stock" || item.status === "Low Stock").slice(0, 5);
    const unusualActivitiesList = alertItems.map((item, idx) => {
      const isOut = item.status === "Out of Stock";
      return {
        id: `act-${item.id}-${idx}`,
        message: isOut 
          ? `Sản phẩm ${item.name} (${item.sku}) đã hết hàng${facilityId === "all" ? " trên toàn hệ thống" : ""}.` 
          : `Cảnh báo: ${item.name} (${item.sku}) sắp hết hàng (Còn ${item.totalStock}).`,
        time: "Vừa cập nhật",
      };
    });
    const unusualActivitiesCount = unusualActivitiesList.length;

    // 7. Sort
    list.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "sku") {
        comparison = (a.sku || "").localeCompare(b.sku || "");
      } else if (sortBy === "name") {
        comparison = (a.name || "").localeCompare(b.name || "");
      } else if (sortBy === "totalStock") {
        comparison = a.totalStock - b.totalStock;
      } else if (sortBy === "unitPrice") {
        comparison = a.unitPrice - b.unitPrice;
      } else if (sortBy === "totalValue") {
        comparison = a.totalValue - b.totalValue;
      } else if (sortBy === "status") {
        comparison = (a.status || "").localeCompare(b.status || "");
      } else {
        comparison = (a.name || "").localeCompare(b.name || "");
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    // 8. Paginate
    const totalItems = list.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedList = list.slice((page - 1) * limit, page * limit);

    return {
      items: paginatedList,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },
      kpis: {
        totalInventoryValue,
        lowStockAlerts,
        outOfStockCount,
        highestStockFacility,
        lowestStockFacility,
        unusualActivities: {
          count: unusualActivitiesCount,
          list: unusualActivitiesList,
        },
      },
      facilities: allFacilities.map((f) => ({ id: f._id.toString(), name: f.name })),
      categories: allCategories.map((c) => ({ id: c._id.toString(), name: c.name })),
    };
  }

  async exportInventoryReport(query: InventoryReportQueryDto, res: any) {
    const data = await this.getInventoryReport({ ...query, page: 1, limit: 10000 });
    return this.writeInventoryExportWorkbook(data.items, res, "inventory-report");
  }

  async exportManagerInventoryReport(accountId: string, query: InventoryReportQueryDto, res: any) {
    const data = await this.getManagerInventoryReport(accountId, { ...query, page: 1, limit: 10000 });
    return this.writeInventoryExportWorkbook(data.items, res, "bao-cao-ton-kho-manager");
  }

  private async writeInventoryExportWorkbook(items: any[], res: any, filenamePrefix: string) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Báo cáo tồn kho");

    sheet.columns = [
      { header: "Mã SKU", key: "sku", width: 20 },
      { header: "Tên sản phẩm", key: "name", width: 35 },
      { header: "Danh mục", key: "categoryName", width: 20 },
      { header: "Tổng số lượng tồn", key: "totalStock", width: 20 },
      { header: "Đơn giá ($)", key: "unitPrice", width: 15 },
      { header: "Tổng giá trị ($)", key: "totalValue", width: 20 },
      { header: "Trạng thái", key: "status", width: 15 },
      { header: "Phân bố chi nhánh", key: "breakdown", width: 45 },
    ];

    for (const item of items) {
      const breakdownStr = item.breakdown
        .map((b: any) => `${b.facilityName}: ${b.stock}`)
        .join(" | ");

      sheet.addRow({
        sku: item.sku,
        name: item.name,
        categoryName: item.categoryName,
        totalStock: item.totalStock,
        unitPrice: item.unitPrice,
        totalValue: item.totalValue,
        status: item.status,
        breakdown: breakdownStr,
      });
    }

    sheet.getRow(1).font = { bold: true };

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filenamePrefix}-${new Date().toISOString().split("T")[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
    return res;
  }

  private async resolveManagerFacilityId(accountId: string): Promise<string | null> {
    const account = await Account.findById(accountId).lean();
    if (!account?.facility) return null;
    return account.facility.toString();
  }

  private async assertManagerCanAccessFacility(accountId: string, facilityId: string): Promise<void> {
    const managerFacilityId = await this.resolveManagerFacilityId(accountId);
    if (!managerFacilityId) {
      throw new BadRequestException("Tài khoản quản lý chưa được phân công cơ sở.");
    }
    if (managerFacilityId !== facilityId) {
      throw new BadRequestException("Bạn chỉ có thể thao tác tồn kho tại cơ sở được phân công.");
    }
  }

  async getManagerInventoryReport(accountId: string, query: InventoryReportQueryDto) {
    const managerFacilityId = await this.resolveManagerFacilityId(accountId);
    if (!managerFacilityId) {
      throw new BadRequestException("Tài khoản quản lý chưa được phân công cơ sở.");
    }
    const scopedQuery = { ...query, facilityId: managerFacilityId };
    const report = await this.getInventoryReport(scopedQuery);

    // Override facilities list to only contain the manager's facility
    const managerFacility = await Facility.findById(managerFacilityId).lean();
    report.facilities = managerFacility
      ? [{ id: managerFacility._id.toString(), name: managerFacility.name || "" }]
      : [];

    return report;
  }

  async adjustStock(accountId: string, dto: AdjustStockDto) {
    const { productId, facilityId, mode, quantity, reason } = dto;

    if (!Number.isFinite(quantity) || quantity < 0) {
      throw new BadRequestException("Số lượng phải là số không âm.");
    }

    if (mode !== "set" && quantity <= 0) {
      throw new BadRequestException("Số lượng điều chỉnh phải lớn hơn 0.");
    }

    const product = await Product.findOne({ _id: productId, deletedAt: null });
    if (!product) {
      throw new EntityNotFoundException("Product");
    }

    const facility = await Facility.findOne({ _id: facilityId, isActive: true });
    if (!facility) {
      throw new EntityNotFoundException("Facility");
    }

    await this.assertManagerCanAccessFacility(accountId, facilityId);

    let inventory = await Inventory.findOne({ product: productId, facility: facilityId });
    if (!inventory) {
      inventory = await Inventory.create({
        facility: facilityId,
        product: productId,
        quantity: 0,
        minimumStockLevel: 10,
      });
    }

    const previousQuantity = inventory.quantity;
    let newQuantity = previousQuantity;

    if (mode === "set") {
      newQuantity = quantity;
    } else if (mode === "add") {
      newQuantity = previousQuantity + quantity;
    } else {
      newQuantity = Math.max(0, previousQuantity - quantity);
    }

    inventory.quantity = newQuantity;
    await inventory.save();

    const totalStock = await Inventory.aggregate([
      { $match: { product: product._id, deletedAt: null } },
      { $group: { _id: null, total: { $sum: "$quantity" } } },
    ]);
    const stockTotal = totalStock[0]?.total ?? 0;
    product.isActive = stockTotal > 0;
    await product.save();

    return {
      productId,
      facilityId,
      facilityName: facility.name,
      productName: product.name,
      previousQuantity,
      newQuantity,
      mode,
      reason: reason?.trim() || null,
    };
  }
}

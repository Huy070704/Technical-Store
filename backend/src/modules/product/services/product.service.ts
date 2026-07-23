import { Service } from "typedi";
import { ClientSession, Types } from "mongoose";
import { Product, ProductDocument } from "../models/product.model";
import { Category, CategoryDocument } from "../models/category.model";
import { Inventory } from "../../inventory/models/inventory.model";

export interface CreateProductDto {
  name: string;
  price: number;
  description?: string;
  categoryId: string;
  isActive?: boolean;
  url?: string;
  specifications?: Record<string, string>;
  [key: string]: unknown;
}

export type UpdateProductDto = Partial<CreateProductDto>;
import {
  EntityNotFoundException,
  BadRequestException,
} from "@/shared/exceptions/http-exceptions";
import { categoryKey } from "../utils/categoryKey";
import { runInTransaction } from "@/shared/mongoose/transaction";

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SPEC_MAX_ENTRIES = 50;
const SPEC_KEY_MAX_LEN = 100;
const SPEC_VALUE_MAX_LEN = 500;

/**
 * Validate trường specifications trước khi lưu vào DB.
 * Ném BadRequestException nếu dữ liệu không hợp lệ.
 */
function validateSpecifications(specs: Record<string, string>): void {
  const entries = Object.entries(specs);

  if (entries.length > SPEC_MAX_ENTRIES) {
    throw new BadRequestException(
      `Thông số kỹ thuật không được vượt quá ${SPEC_MAX_ENTRIES} mục.`
    );
  }

  const seenKeys = new Set<string>();

  for (const [key, value] of entries) {
    const trimmedKey = key.trim();

    if (!trimmedKey) {
      throw new BadRequestException(
        "Tên thông số kỹ thuật không được để trống."
      );
    }
    if (trimmedKey.length > SPEC_KEY_MAX_LEN) {
      throw new BadRequestException(
        `Tên thông số "${trimmedKey.slice(0, 30)}..." vượt quá ${SPEC_KEY_MAX_LEN} ký tự.`
      );
    }
    if (typeof value !== "string") {
      throw new BadRequestException(
        `Giá trị của thông số "${trimmedKey}" phải là chuỗi văn bản.`
      );
    }
    if (value.trim().length === 0) {
      throw new BadRequestException(
        `Giá trị của thông số "${trimmedKey}" không được để trống.`
      );
    }
    if (value.length > SPEC_VALUE_MAX_LEN) {
      throw new BadRequestException(
        `Giá trị của thông số "${trimmedKey}" vượt quá ${SPEC_VALUE_MAX_LEN} ký tự.`
      );
    }
    if (seenKeys.has(trimmedKey.toLowerCase())) {
      throw new BadRequestException(
        `Tên thông số "${trimmedKey}" bị trùng lặp.`
      );
    }
    seenKeys.add(trimmedKey.toLowerCase());
  }
}

function getSpecValue(updateData: any, key: string, type: "string" | "number" | "boolean" = "string"): any {
  if (!updateData) return undefined;
  let val = undefined;
  if (updateData[key] !== undefined) {
    val = updateData[key];
  } else if (updateData.specifications) {
    if (updateData.specifications instanceof Map) {
      val = updateData.specifications.get(key);
    } else if (typeof updateData.specifications === "object") {
      val = updateData.specifications[key];
    }
  }

  if (val === undefined || val === null) return undefined;

  if (type === "number") {
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }
  if (type === "boolean") {
    return val === true || val === "true" || val === 1 || val === "1";
  }
  return String(val);
}

/** Gộp các trường của bảng component đặc thù vào product (loại id/timestamps/product). */
function mergeDetail(productDoc: ProductDocument, detail: any): any {
  const base = productDoc.toJSON();
  if (!detail) return base;
  const obj = detail.toObject ? detail.toObject() : { ...detail };
  delete obj._id;
  delete obj.id;
  delete obj.createdAt;
  delete obj.updatedAt;
  delete obj.product;
  delete obj.deletedAt;
  delete obj.__v;
  return { ...base, ...obj };
}

@Service()
export class ProductService {
  /**
   * Tổng tồn kho (cộng quantity mọi facility) cho danh sách product.
   * Tồn kho nay nằm ở bảng Inventory thay vì field stock trên Product.
   */
  private async getStockMap(
    productIds: (string | Types.ObjectId)[]
  ): Promise<Map<string, number>> {
    if (!productIds.length) return new Map();
    const objectIds = productIds.map((id) => new Types.ObjectId(String(id)));
    const rows = await Inventory.aggregate([
      { $match: { product: { $in: objectIds }, deletedAt: null } },
      { $group: { _id: "$product", total: { $sum: "$quantity" } } },
    ]);
    return new Map(rows.map((r: any) => [r._id.toString(), r.total as number]));
  }

  /** Gắn field `stock` (tổng tồn từ Inventory) vào từng product trả về cho client. */
  private async attachStock(products: ProductDocument[]): Promise<any[]> {
    const stockMap = await this.getStockMap(products.map((p) => p._id));
    return products.map((p) => ({
      ...p.toJSON(),
      stock: stockMap.get(p._id.toString()) ?? 0,
    }));
  }

  private async getCategoryById(id: string): Promise<CategoryDocument> {
    const category = await Category.findById(id);
    if (!category) {
      throw new EntityNotFoundException(`Category with id '${id}' not found`);
    }
    return category;
  }

  private async getCategoryByName(name: string): Promise<CategoryDocument> {
    const category = await Category.findOne({ name });
    if (!category) {
      throw new EntityNotFoundException(`Category with name '${name}' not found`);
    }
    return category;
  }

  private async getCategoriesByIds(ids: string[]): Promise<CategoryDocument[]> {
    const categories = await Category.find({ _id: { $in: ids } });
    if (categories.length !== ids.length) {
      const foundIds = categories.map((cat) => cat.id);
      const missingIds = ids.filter((id) => !foundIds.includes(id));
      throw new EntityNotFoundException(
        `Categories not found: ${missingIds.join(", ")}`
      );
    }
    return categories;
  }

  private async getCategoriesByNames(names: string[]): Promise<CategoryDocument[]> {
    const categories = await Category.find({ name: { $in: names } });
    if (categories.length !== names.length) {
      const foundNames = categories.map((cat) => cat.name).filter(Boolean);
      const missingNames = names.filter((name) => !foundNames.includes(name));
      throw new EntityNotFoundException(
        `Categories not found: ${missingNames.join(", ")}`
      );
    }
    return categories;
  }

  async getAllProducts(): Promise<any[]> {
    const products = await Product.find({ isActive: true })
      .populate("category")
      .populate("images")
      .sort({ createdAt: -1 });
    return this.attachStock(products);
  }

  /** Lấy sản phẩm theo tồn kho của một cơ sở cụ thể (dùng cho bán hàng tại quầy). */
  async getProductsByFacility(facilityId: string): Promise<any[]> {
    const facilityObjectId = new Types.ObjectId(facilityId);
    const inventories = await Inventory.find({
      facility: facilityObjectId,
      deletedAt: null,
    }).populate({
      path: "product",
      populate: [{ path: "category" }, { path: "images" }],
    });

    return inventories
      .filter((inv) => {
        const p = inv.product as ProductDocument | null;
        return p && !p.deletedAt && p.isActive;
      })
      .map((inv) => {
        const p = inv.product as ProductDocument;
        return { ...p.toJSON(), stock: inv.quantity };
      });
  }

  /**
   * Lấy tất cả sản phẩm (kể cả hết hàng) với stock chỉ từ một cơ sở cụ thể.
   * Dùng cho Manager quản lý sản phẩm tại cơ sở của mình.
   */
  async getAllProductsByFacility(
    facilityId: string
  ): Promise<any[]> {
    const facilityObjectId = new Types.ObjectId(facilityId);

    const products = await Product.find()
      .populate("category")
      .populate("images")
      .sort({ createdAt: -1 })
      .setOptions({ withDeleted: true });

    const productIds = products.map((p) => p._id);

    const inventories = await Inventory.find({
      facility: facilityObjectId,
      product: { $in: productIds },
      deletedAt: null,
    })
      .setOptions({ withDeleted: true })
      .lean();

    const stockMap = new Map<string, number>();

    for (const inv of inventories) {
      stockMap.set(
        inv.product.toString(),
        inv.quantity
      );
    }

    return products.map((p) => ({
      ...p.toJSON(),
      stock: stockMap.get(p._id.toString()) ?? 0,
    }));
  }

  async getNewLaptops(limit: number = 8): Promise<any[]> {
    const laptopCategory = await this.getCategoryByName("Laptop");

    const products = await Product.find({
      isActive: true,
      categoryId: laptopCategory._id,
    })
      .populate("category")
      .populate("images")
      .sort({ createdAt: -1 })
      .limit(limit);
    return this.attachStock(products);
  }

  async getNewPCs(limit: number = 8): Promise<any[]> {
    const pcCategory = await this.getCategoryByName("PC");

    const products = await Product.find({
      isActive: true,
      categoryId: pcCategory._id,
    })
      .populate("category")
      .populate("images")
      .sort({ createdAt: -1 })
      .limit(limit);
    return this.attachStock(products);
  }

  async getNewAccessories(limit: number = 8): Promise<any[]> {
    const [laptopCategory, pcCategory] = await this.getCategoriesByNames([
      "Laptop",
      "PC",
    ]);

    const products = await Product.find({
      isActive: true,
      categoryId: { $nin: [laptopCategory._id, pcCategory._id] },
    })
      .populate("category")
      .populate("images")
      .sort({ createdAt: -1 })
      .limit(limit);
    return this.attachStock(products);
  }

  async getNewProducts(limit: number = 8) {
    const [laptops, pcs, accessories] = await Promise.all([
      this.getNewLaptops(limit),
      this.getNewPCs(limit),
      this.getNewAccessories(limit),
    ]);
    return { laptops, pcs, accessories };
  }

  async getTopSellingProducts(limit: number = 6): Promise<any[]> {
    // For now, return newest products (as a proxy for popularity)
    const products = await Product.find({ isActive: true })
      .populate("category")
      .populate("images")
      .sort({ createdAt: -1 })
      .limit(limit);
    return this.attachStock(products);
  }

  async getProductsByCategory(categoryId: string): Promise<any[]> {
    await this.getCategoryById(categoryId); // Validate category exists

    const products = await Product.find({
      isActive: true,
      categoryId,
    })
      .populate("category")
      .sort({ createdAt: -1 });
    return this.attachStock(products);
  }

  private async loadComponentDetail(key: string, productId: string): Promise<any> {
    switch (key) {
      case "cpu": {
        const { CPU } = await import("../components/models/cpu.model");
        return CPU.findOne({ product: productId }).populate("product");
      }
      case "laptop": {
        const { Laptop } = await import("../components/laptop/models/laptop.model");
        return Laptop.findOne({ product: productId }).populate("product");
      }
      case "pc": {
        const { PC } = await import("../components/models/pc.model");
        return PC.findOne({ product: productId }).populate("product");
      }
      case "ram": {
        const { RAM } = await import("../components/models/ram.model");
        return RAM.findOne({ product: productId }).populate("product");
      }
      case "gpu": {
        const { GPU } = await import("../components/models/gpu.model");
        return GPU.findOne({ product: productId }).populate("product");
      }
      case "psu": {
        const { PSU } = await import("../components/models/psu.model");
        return PSU.findOne({ product: productId }).populate("product");
      }
      case "drive": {
        const { Drive } = await import("../components/models/drive.model");
        return Drive.findOne({ product: productId }).populate("product");
      }
      case "motherboard": {
        const { Motherboard } = await import("../components/models/motherboard.model");
        return Motherboard.findOne({ product: productId }).populate("product");
      }
      case "cooler": {
        const { Cooler } = await import("../components/models/cooler.model");
        return Cooler.findOne({ product: productId }).populate("product");
      }
      case "case": {
        const { Case } = await import("../components/models/case.model");
        return Case.findOne({ product: productId }).populate("product");
      }
      case "monitor": {
        const { Monitor } = await import("../components/models/monitor.model");
        return Monitor.findOne({ product: productId }).populate("product");
      }
      case "mouse": {
        const { Mouse } = await import("../components/models/mouse.model");
        return Mouse.findOne({ product: productId }).populate("product");
      }
      case "network-card": {
        const { NetworkCard } = await import("../components/models/networkCard.model");
        return NetworkCard.findOne({ product: productId }).populate("product");
      }
      case "headset": {
        const { Headset } = await import("../components/models/headset.model");
        return Headset.findOne({ product: productId }).populate("product");
      }
      case "keyboard": {
        const { Keyboard } = await import("../components/models/keyboard.model");
        return Keyboard.findOne({ product: productId }).populate("product");
      }
      default:
        return null;
    }
  }



  async getProductById(id: string): Promise<any | null> {
    const product = await Product.findOne({ _id: id, isActive: true })
      .populate("category")
      .populate("images");

    if (!product) {
      throw new EntityNotFoundException("Product not found");
    }

    const categoryId = product.categoryId;
    if (!categoryId) {
      throw new BadRequestException("Product category not found");
    }

    // Lấy category để xác định loại component
    const category = await Category.findById(categoryId);
    if (!category || !category.name) {
      throw new BadRequestException("Product category not found");
    }

    // const detail = await this.loadComponentDetail(categoryKey(category), id);
    // const stockMap = await this.getStockMap([product._id]);

    const detail = await this.loadComponentDetail(categoryKey(category), id);

    console.log("========== DETAIL ==========");
    console.log(detail);

    const merged = mergeDetail(product, detail);

    console.log("========== MERGED ==========");
    console.log(merged);

    const stockMap = await this.getStockMap([product._id]);

    return { ...mergeDetail(product, detail), stock: stockMap.get(product._id.toString()) ?? 0 };
  }

  /** Admin / nội bộ: không lọc stock. */
  async getProductByIdForAdmin(id: string): Promise<any | null> {
    const product = await Product.findById(id)
      .populate("category")
      .populate("images")
      .setOptions({ withDeleted: true }); // Admin cần thấy cả sản phẩm đã deactivate
    if (!product) {
      throw new EntityNotFoundException("Product not found");
    }
    const category = product.category;
    if (!category) {
      throw new BadRequestException("Product category not found");
    }
    const detail = await this.loadComponentDetail(categoryKey(category), id);
    const stockMap = await this.getStockMap([product._id]);

    console.log("DETAIL =", detail);
    console.log("MERGED =", mergeDetail(product, detail));
    return { ...mergeDetail(product, detail), stock: stockMap.get(product._id.toString()) ?? 0 };
  }



  async getProductByName(name: string): Promise<any | null> {
    const product = await Product.findOne({ name, isActive: true }).populate(
      "category"
    );
    if (!product) return null;
    const stockMap = await this.getStockMap([product._id]);
    return { ...product.toJSON(), stock: stockMap.get(product._id.toString()) ?? 0 };
  }

  async createProduct(createProductDto: CreateProductDto): Promise<ProductDocument> {
    return runInTransaction(async (session) => {
      // Validate category exists
      const category = await Category.findById(createProductDto.categoryId).session(
        session ?? null
      );
      if (!category) {
        throw new EntityNotFoundException(
          `Category with id '${createProductDto.categoryId}' not found`
        );
      }

      // Validate price and stock
      if (createProductDto.price <= 0) {
        throw new BadRequestException("Price must be greater than 0");
      }

      // Check if product with same name already exists
      const existingProduct = await Product.findOne({
        name: createProductDto.name,
      }).session(session ?? null);
      if (existingProduct) {
        throw new BadRequestException("Product with this name already exists");
      }

      const product = new Product();
      const { specifications: specsCreate, ...restCreate } = createProductDto;
      Object.assign(product, restCreate);
      if (createProductDto.imageUrl) {
        product.image = createProductDto.imageUrl as string;
      }
      // Validate + convert specifications → Mongoose Map
      if (specsCreate && typeof specsCreate === 'object') {
        validateSpecifications(specsCreate);
        product.specifications = new Map(
          Object.entries(specsCreate).map(([k, v]) => [k.trim(), v.trim()])
        );
      }
      // Set isActive
      product.isActive = true;

      await product.save({ session: session ?? undefined });

      // Load lại product kèm category
      const savedProductWithCategory = await Product.findById(product._id)
        .populate("category")
        .session(session ?? null);
      if (!savedProductWithCategory) {
        throw new Error("Cannot load product with category after save");
      }
      // Lưu vào bảng component đặc thù nếu có
      try {
        await this.updateComponentDetails(
          session,
          savedProductWithCategory,
          createProductDto
        );
      } catch (componentError) {
        throw new BadRequestException(
          "Lỗi khi lưu vào bảng component đặc thù: " + String(componentError)
        );
      }
      return savedProductWithCategory;
    });
  }

  async updateProduct(id: string, updateProductDto: any): Promise<ProductDocument | null> {
    return runInTransaction(async (session) => {
      const product = await Product.findById(id)
        .setOptions({ withDeleted: true })
        .populate("category")
        .session(session ?? null);
      if (!product) {
        throw new EntityNotFoundException("Product");
      }

      // Extract product fields and component fields
      const productFields: any = {
        name: updateProductDto.name,
        description: updateProductDto.description,
        price: updateProductDto.price,
        categoryId: updateProductDto.categoryId,
        isActive: updateProductDto.isActive,
        url: updateProductDto.url,
        specifications: updateProductDto.specifications,
        image: updateProductDto.imageUrl !== undefined ? updateProductDto.imageUrl : updateProductDto.image,
      };

      // Remove undefined fields
      Object.keys(productFields).forEach((key) => {
        if (productFields[key] === undefined) {
          delete productFields[key];
        }
      });

      // Validate category if provided
      if (productFields.categoryId) {
        const category = await Category.findById(productFields.categoryId).session(
          session ?? null
        );
        if (!category) {
          throw new EntityNotFoundException("Category");
        }
        product.categoryId = category._id;
      }

      // Validate price if provided
      if (productFields.price !== undefined && productFields.price <= 0) {
        throw new BadRequestException("Price must be greater than 0");
      }

      // Check if product with same name already exists (excluding current product)
      if (productFields.name) {
        const existingProduct = await Product.findOne({
          name: productFields.name,
          _id: { $ne: id },
        }).session(session ?? null);
        if (existingProduct) {
          throw new BadRequestException("Product with this name already exists");
        }
      }

      // Update product basic fields
      // Xử lý thời điểm ngừng / mở lại kinh doanh
      if (productFields.isActive !== undefined) {
        if (productFields.isActive === false) {
          // Chỉ ghi thời gian nếu trước đó sản phẩm đang hoạt động
          if (product.isActive === true) {
            product.deletedAt = new Date();
          }
        } else if (productFields.isActive === true) {
          // Kinh doanh lại thì xóa thời gian soft delete
          product.deletedAt = null;
        }
      }

      // Update product basic fields
      const {
        specifications: specsUpdate,
        ...productFieldsWithoutSpecs
      } = productFields;

      Object.assign(product, productFieldsWithoutSpecs);
      // Validate + convert specifications → Mongoose Map
      if (specsUpdate !== undefined) {
        if (specsUpdate && typeof specsUpdate === 'object') {
          validateSpecifications(specsUpdate);
          product.specifications = new Map(
            Object.entries(specsUpdate).map(([k, v]) => [k.trim(), String(v ?? "").trim()])
          );
        } else {
          product.specifications = new Map();
        }
      }

      await product.save({ session: session ?? undefined });
      // Dùng withDeleted: true để load được cả product vừa bị deactivate (deletedAt != null)
      const withCategory = await Product.findById(product._id)
        .populate("category")
        .populate("images")
        .session(session ?? null)
        .setOptions({ withDeleted: true });
      if (!withCategory) {
        throw new EntityNotFoundException("Product");
      }
      await this.updateComponentDetails(session, withCategory, updateProductDto);
      return withCategory;
    });
  }

  private async updateComponentDetails(
    session: ClientSession | undefined,
    product: ProductDocument,
    updateData: any
  ): Promise<void> {
    const category = product.category;
    if (!category || !category.name) return;
    switch (categoryKey(category)) {
      case "laptop":
        await this.updateLaptopDetails(session, product, updateData);
        break;
      case "ram":
        await this.updateRAMDetails(session, product, updateData);
        break;
      case "cpu":
        await this.updateCPUDetails(session, product, updateData);
        break;
      case "gpu":
        await this.updateGPUDetails(session, product, updateData);
        break;
      case "monitor":
        await this.updateMonitorDetails(session, product, updateData);
        break;
      case "motherboard":
        await this.updateMotherboardDetails(session, product, updateData);
        break;
      case "psu":
        await this.updatePSUDetails(session, product, updateData);
        break;
      case "drive":
        await this.updateDriveDetails(session, product, updateData);
        break;
      case "cooler":
        await this.updateCoolerDetails(session, product, updateData);
        break;
      case "pc":
        await this.updatePCDetails(session, product, updateData);
        break;
      case "network-card":
        await this.updateNetworkCardDetails(session, product, updateData);
        break;
      case "case":
        await this.updateCaseDetails(session, product, updateData);
        break;
      case "mouse":
        await this.updateMouseDetails(session, product, updateData);
        break;
      case "keyboard":
        await this.updateKeyboardDetails(session, product, updateData);
        break;
      case "headset":
        await this.updateHeadsetDetails(session, product, updateData);
        break;
      default:
        break;
    }
  }

  private async findOrCreateComponent(
    Model: any,
    product: ProductDocument,
    session: ClientSession | undefined
  ): Promise<any> {
    let comp = await Model.findOne({ product: product._id }).session(session ?? null);
    if (!comp) {
      comp = new Model();
      comp.product = product._id;
    }
    return comp;
  }

  /** Trả về true nếu updateData hoặc specifications có ít nhất 1 trong các field được liệt kê. */
  private hasAnyField(updateData: any, fields: string[]): boolean {
    return fields.some((f) => getSpecValue(updateData, f) !== undefined);
  }

  private async updateRAMDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { RAM } = await import("../components/models/ram.model");
    const ram = await this.findOrCreateComponent(RAM, product, session);
    const ramFields = ["brand", "model", "capacityGb", "speedMhz", "type"];
    if (ram.isNew && !this.hasAnyField(updateData, ramFields)) return;

    const brand = getSpecValue(updateData, "brand");
    if (brand !== undefined) ram.brand = brand;
    const model = getSpecValue(updateData, "model");
    if (model !== undefined) ram.model = model;
    const capacityGb = getSpecValue(updateData, "capacityGb", "number");
    if (capacityGb !== undefined) ram.capacityGb = capacityGb;
    const speedMhz = getSpecValue(updateData, "speedMhz", "number");
    if (speedMhz !== undefined) ram.speedMhz = speedMhz;
    const type = getSpecValue(updateData, "type");
    if (type !== undefined) ram.type = type;

    try {
      await ram.save({ session: session ?? undefined });
    } catch (err) {
      throw new Error("Không thể lưu thông tin RAM cho sản phẩm");
    }
  }

  private async updateLaptopDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Laptop } = await import("../components/laptop/models/laptop.model");
    const laptop = await this.findOrCreateComponent(Laptop, product, session);
    const laptopFields = ["brand", "model", "screenSize", "screenType", "resolution", "batteryLifeHours", "weightKg", "os", "ramCount"];
    if (laptop.isNew && !this.hasAnyField(updateData, laptopFields)) return;

    const brand = getSpecValue(updateData, "brand");
    if (brand !== undefined) laptop.brand = brand;
    const model = getSpecValue(updateData, "model");
    if (model !== undefined) laptop.model = model;
    const screenSize = getSpecValue(updateData, "screenSize", "number");
    if (screenSize !== undefined) laptop.screenSize = screenSize;
    const screenType = getSpecValue(updateData, "screenType");
    if (screenType !== undefined) laptop.screenType = screenType;
    const resolution = getSpecValue(updateData, "resolution");
    if (resolution !== undefined) laptop.resolution = resolution;
    const batteryLifeHours = getSpecValue(updateData, "batteryLifeHours", "number");
    if (batteryLifeHours !== undefined) laptop.batteryLifeHours = batteryLifeHours;
    const weightKg = getSpecValue(updateData, "weightKg", "number");
    if (weightKg !== undefined) laptop.weightKg = weightKg;
    const os = getSpecValue(updateData, "os");
    if (os !== undefined) laptop.os = os;
    const ramCount = getSpecValue(updateData, "ramCount", "number");
    if (ramCount !== undefined) laptop.ramCount = ramCount;

    try {
      await laptop.save({ session: session ?? undefined });
    } catch (err) {
      throw new Error("Không thể lưu thông tin Laptop cho sản phẩm");
    }
  }

  private async updateCPUDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { CPU } = await import("../components/models/cpu.model");
    const cpu = await this.findOrCreateComponent(CPU, product, session);
    const cpuFields = ["cores", "threads", "baseClock", "boostClock", "socket", "architecture", "tdp", "integratedGraphics"];
    if (cpu.isNew && !this.hasAnyField(updateData, cpuFields)) return;

    const cores = getSpecValue(updateData, "cores", "number");
    if (cores !== undefined) cpu.cores = cores;
    const threads = getSpecValue(updateData, "threads", "number");
    if (threads !== undefined) cpu.threads = threads;
    const baseClock = getSpecValue(updateData, "baseClock");
    if (baseClock !== undefined) cpu.baseClock = baseClock;
    const boostClock = getSpecValue(updateData, "boostClock");
    if (boostClock !== undefined) cpu.boostClock = boostClock;
    const socket = getSpecValue(updateData, "socket");
    if (socket !== undefined) cpu.socket = socket;
    const architecture = getSpecValue(updateData, "architecture");
    if (architecture !== undefined) cpu.architecture = architecture;
    const tdp = getSpecValue(updateData, "tdp", "number");
    if (tdp !== undefined) cpu.tdp = tdp;
    const integratedGraphics = getSpecValue(updateData, "integratedGraphics");
    if (integratedGraphics !== undefined) cpu.integratedGraphics = integratedGraphics;

    try {
      await cpu.save({ session: session ?? undefined });
    } catch (err) {
      throw new Error("Không thể lưu thông tin CPU cho sản phẩm");
    }
  }

  private async updateGPUDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { GPU } = await import("../components/models/gpu.model");
    const gpu = await this.findOrCreateComponent(GPU, product, session);
    const gpuFields = ["brand", "model", "vram", "chipset", "memoryType", "lengthMm"];
    if (gpu.isNew && !this.hasAnyField(updateData, gpuFields)) return;

    const brand = getSpecValue(updateData, "brand");
    if (brand !== undefined) gpu.brand = brand;
    const model = getSpecValue(updateData, "model");
    if (model !== undefined) gpu.model = model;
    const vram = getSpecValue(updateData, "vram", "number");
    if (vram !== undefined) gpu.vram = vram;
    const chipset = getSpecValue(updateData, "chipset");
    if (chipset !== undefined) gpu.chipset = chipset;
    const memoryType = getSpecValue(updateData, "memoryType");
    if (memoryType !== undefined) gpu.memoryType = memoryType;
    const lengthMm = getSpecValue(updateData, "lengthMm", "number");
    if (lengthMm !== undefined) gpu.lengthMm = lengthMm;

    try {
      await gpu.save({ session: session ?? undefined });
    } catch (err) {
      throw new Error("Không thể lưu thông tin GPU cho sản phẩm");
    }
  }

  private async updateMonitorDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Monitor } = await import("../components/models/monitor.model");
    const monitor = await this.findOrCreateComponent(Monitor, product, session);
    const monitorFields = ["brand", "model", "sizeInch", "resolution", "panelType", "refreshRate"];
    if (monitor.isNew && !this.hasAnyField(updateData, monitorFields)) return;

    const brand = getSpecValue(updateData, "brand");
    if (brand !== undefined) monitor.brand = brand;
    const model = getSpecValue(updateData, "model");
    if (model !== undefined) monitor.model = model;
    const sizeInch = getSpecValue(updateData, "sizeInch", "number");
    if (sizeInch !== undefined) monitor.sizeInch = sizeInch;
    const resolution = getSpecValue(updateData, "resolution");
    if (resolution !== undefined) monitor.resolution = resolution;
    const panelType = getSpecValue(updateData, "panelType");
    if (panelType !== undefined) monitor.panelType = panelType;
    const refreshRate = getSpecValue(updateData, "refreshRate", "number");
    if (refreshRate !== undefined) monitor.refreshRate = refreshRate;

    try {
      await monitor.save({ session: session ?? undefined });
    } catch (err) {
      throw new Error("Không thể lưu thông tin Monitor cho sản phẩm");
    }
  }

  private async updateMotherboardDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Motherboard } = await import("../components/models/motherboard.model");
    const motherboard = await this.findOrCreateComponent(Motherboard, product, session);
    const mbFields = ["brand", "model", "socket", "chipset", "formFactor", "ramSlots", "maxRam"];
    if (motherboard.isNew && !this.hasAnyField(updateData, mbFields)) return;

    const brand = getSpecValue(updateData, "brand");
    if (brand !== undefined) motherboard.brand = brand;
    const model = getSpecValue(updateData, "model");
    if (model !== undefined) motherboard.model = model;
    const socket = getSpecValue(updateData, "socket");
    if (socket !== undefined) motherboard.socket = socket;
    const chipset = getSpecValue(updateData, "chipset");
    if (chipset !== undefined) motherboard.chipset = chipset;
    const formFactor = getSpecValue(updateData, "formFactor");
    if (formFactor !== undefined) motherboard.formFactor = formFactor;
    const ramSlots = getSpecValue(updateData, "ramSlots", "number");
    if (ramSlots !== undefined) motherboard.ramSlots = ramSlots;
    const maxRam = getSpecValue(updateData, "maxRam", "number");
    if (maxRam !== undefined) motherboard.maxRam = maxRam;

    try {
      await motherboard.save({ session: session ?? undefined });
    } catch (err) {
      throw new Error("Không thể lưu thông tin Motherboard cho sản phẩm");
    }
  }

  private async updatePSUDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { PSU } = await import("../components/models/psu.model");
    const psu = await this.findOrCreateComponent(PSU, product, session);
    const psuFields = ["brand", "model", "wattage"];
    if (psu.isNew && !this.hasAnyField(updateData, psuFields)) return;

    const brand = getSpecValue(updateData, "brand");
    if (brand !== undefined) psu.brand = brand;
    const model = getSpecValue(updateData, "model");
    if (model !== undefined) psu.model = model;
    const wattage = getSpecValue(updateData, "wattage", "number");
    if (wattage !== undefined) psu.wattage = wattage;

    try {
      await psu.save({ session: session ?? undefined });
    } catch (err) {
      throw new Error("Không thể lưu thông tin PSU cho sản phẩm");
    }
  }

  private async updateDriveDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Drive } = await import("../components/models/drive.model");
    const drive = await this.findOrCreateComponent(Drive, product, session);
    const driveFields = ["brand", "model", "type", "capacityGb", "interface"];
    if (drive.isNew && !this.hasAnyField(updateData, driveFields)) return;

    const brand = getSpecValue(updateData, "brand");
    if (brand !== undefined) drive.brand = brand;
    const model = getSpecValue(updateData, "model");
    if (model !== undefined) drive.model = model;
    const type = getSpecValue(updateData, "type");
    if (type !== undefined) drive.type = type;
    const capacityGb = getSpecValue(updateData, "capacityGb", "number");
    if (capacityGb !== undefined) drive.capacityGb = capacityGb;
    const driveInterface = getSpecValue(updateData, "interface");
    if (driveInterface !== undefined) drive.interface = driveInterface;

    await drive.save({ session: session ?? undefined });
  }

  private async updateCoolerDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Cooler } = await import("../components/models/cooler.model");
    const cooler = await this.findOrCreateComponent(Cooler, product, session);
    const coolerFields = ["brand", "model", "type", "supportedSockets", "fanSizeMm"];
    if (cooler.isNew && !this.hasAnyField(updateData, coolerFields)) return;

    const brand = getSpecValue(updateData, "brand");
    if (brand !== undefined) cooler.brand = brand;
    const model = getSpecValue(updateData, "model");
    if (model !== undefined) cooler.model = model;
    const type = getSpecValue(updateData, "type");
    if (type !== undefined) cooler.type = type;
    const supportedSockets = getSpecValue(updateData, "supportedSockets");
    if (supportedSockets !== undefined) cooler.supportedSockets = supportedSockets;
    const fanSizeMm = getSpecValue(updateData, "fanSizeMm", "number");
    if (fanSizeMm !== undefined) cooler.fanSizeMm = fanSizeMm;

    await cooler.save({ session: session ?? undefined });
  }

  private async updatePCDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { PC } = await import("../components/models/pc.model");
    const pc = await this.findOrCreateComponent(PC, product, session);
    const pcFields = ["brand", "model", "processor", "ramGb", "storageGb", "storageType", "graphics", "formFactor", "powerSupplyWattage", "operatingSystem"];
    if (pc.isNew && !this.hasAnyField(updateData, pcFields)) return;

    const brand = getSpecValue(updateData, "brand");
    if (brand !== undefined) pc.brand = brand;
    const model = getSpecValue(updateData, "model");
    if (model !== undefined) pc.model = model;
    const processor = getSpecValue(updateData, "processor");
    if (processor !== undefined) pc.processor = processor;
    const ramGb = getSpecValue(updateData, "ramGb", "number");
    if (ramGb !== undefined) pc.ramGb = ramGb;
    const storageGb = getSpecValue(updateData, "storageGb", "number");
    if (storageGb !== undefined) pc.storageGb = storageGb;
    const storageType = getSpecValue(updateData, "storageType");
    if (storageType !== undefined) pc.storageType = storageType;
    const graphics = getSpecValue(updateData, "graphics");
    if (graphics !== undefined) pc.graphics = graphics;
    const formFactor = getSpecValue(updateData, "formFactor");
    if (formFactor !== undefined) pc.formFactor = formFactor;
    const powerSupplyWattage = getSpecValue(updateData, "powerSupplyWattage", "number");
    if (powerSupplyWattage !== undefined) pc.powerSupplyWattage = powerSupplyWattage;
    const operatingSystem = getSpecValue(updateData, "operatingSystem");
    if (operatingSystem !== undefined) pc.operatingSystem = operatingSystem;

    await pc.save({ session: session ?? undefined });
  }

  private async updateNetworkCardDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { NetworkCard } = await import("../components/models/networkCard.model");
    const nc = await this.findOrCreateComponent(NetworkCard, product, session);
    const ncFields = ["type", "interface", "speedMbps"];
    if (nc.isNew && !this.hasAnyField(updateData, ncFields)) return;

    const type = getSpecValue(updateData, "type");
    if (type !== undefined) nc.type = type;
    const ncInterface = getSpecValue(updateData, "interface");
    if (ncInterface !== undefined) nc.interface = ncInterface;
    const speedMbps = getSpecValue(updateData, "speedMbps", "number");
    if (speedMbps !== undefined) nc.speedMbps = speedMbps;

    await nc.save({ session: session ?? undefined });
  }

  private async updateCaseDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Case } = await import("../components/models/case.model");
    const c = await this.findOrCreateComponent(Case, product, session);
    const caseFields = ["brand", "model", "formFactorSupport", "hasRgb", "sidePanelType", "maxGpuLengthMm", "psuType"];
    if (c.isNew && !this.hasAnyField(updateData, caseFields)) return;

    const brand = getSpecValue(updateData, "brand");
    if (brand !== undefined) c.brand = brand;
    const model = getSpecValue(updateData, "model");
    if (model !== undefined) c.model = model;
    const formFactorSupport = getSpecValue(updateData, "formFactorSupport");
    if (formFactorSupport !== undefined) c.formFactorSupport = formFactorSupport;
    const hasRgb = getSpecValue(updateData, "hasRgb", "boolean");
    if (hasRgb !== undefined) c.hasRgb = hasRgb;
    const sidePanelType = getSpecValue(updateData, "sidePanelType");
    if (sidePanelType !== undefined) c.sidePanelType = sidePanelType;
    const maxGpuLengthMm = getSpecValue(updateData, "maxGpuLengthMm", "number");
    if (maxGpuLengthMm !== undefined) c.maxGpuLengthMm = maxGpuLengthMm;
    const psuType = getSpecValue(updateData, "psuType");
    if (psuType !== undefined) c.psuType = psuType;

    await c.save({ session: session ?? undefined });
  }

  private async updateMouseDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Mouse } = await import("../components/models/mouse.model");
    const m = await this.findOrCreateComponent(Mouse, product, session);
    const mouseFields = ["type", "dpi", "connectivity", "hasRgb"];
    if (m.isNew && !this.hasAnyField(updateData, mouseFields)) return;

    const type = getSpecValue(updateData, "type");
    if (type !== undefined) m.type = type;
    const dpi = getSpecValue(updateData, "dpi", "number");
    if (dpi !== undefined) m.dpi = dpi;
    const connectivity = getSpecValue(updateData, "connectivity");
    if (connectivity !== undefined) m.connectivity = connectivity;
    const hasRgb = getSpecValue(updateData, "hasRgb", "boolean");
    if (hasRgb !== undefined) m.hasRgb = hasRgb;

    await m.save({ session: session ?? undefined });
  }

  private async updateKeyboardDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Keyboard } = await import("../components/models/keyboard.model");
    const k = await this.findOrCreateComponent(Keyboard, product, session);
    const kbFields = ["type", "switchType", "connectivity", "layout", "hasRgb"];
    if (k.isNew && !this.hasAnyField(updateData, kbFields)) return;

    const type = getSpecValue(updateData, "type");
    if (type !== undefined) k.type = type;
    const switchType = getSpecValue(updateData, "switchType");
    if (switchType !== undefined) k.switchType = switchType;
    const connectivity = getSpecValue(updateData, "connectivity");
    if (connectivity !== undefined) k.connectivity = connectivity;
    const layout = getSpecValue(updateData, "layout");
    if (layout !== undefined) k.layout = layout;
    const hasRgb = getSpecValue(updateData, "hasRgb", "boolean");
    if (hasRgb !== undefined) k.hasRgb = hasRgb;

    await k.save({ session: session ?? undefined });
  }

  private async updateHeadsetDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Headset } = await import("../components/models/headset.model");
    const h = await this.findOrCreateComponent(Headset, product, session);
    const headsetFields = ["hasMicrophone", "connectivity", "surroundSound"];
    if (h.isNew && !this.hasAnyField(updateData, headsetFields)) return;

    const hasMicrophone = getSpecValue(updateData, "hasMicrophone", "boolean");
    if (hasMicrophone !== undefined) h.hasMicrophone = hasMicrophone;
    const connectivity = getSpecValue(updateData, "connectivity");
    if (connectivity !== undefined) h.connectivity = connectivity;
    const surroundSound = getSpecValue(updateData, "surroundSound", "boolean");
    if (surroundSound !== undefined) h.surroundSound = surroundSound;

    await h.save({ session: session ?? undefined });
  }

  async deleteProduct(id: string): Promise<boolean> {
    return runInTransaction(async (session) => {
      const opts = { session: session ?? undefined };
      const product = await Product.findById(id)
        .populate("category")
        .session(session ?? null);
      if (!product) {
        throw new EntityNotFoundException("Product");
      }

      if (product.category) {
        const slug = categoryKey(product.category);
        switch (slug) {
          case "cpu": {
            const { CPU } = await import("../components/models/cpu.model");
            await CPU.deleteMany({ product: id }, opts);
            break;
          }
          case "ram": {
            const { RAM } = await import("../components/models/ram.model");
            await RAM.deleteMany({ product: id }, opts);
            break;
          }
          case "gpu": {
            const { GPU } = await import("../components/models/gpu.model");
            await GPU.deleteMany({ product: id }, opts);
            break;
          }
          case "psu": {
            const { PSU } = await import("../components/models/psu.model");
            await PSU.deleteMany({ product: id }, opts);
            break;
          }
          case "drive": {
            const { Drive } = await import("../components/models/drive.model");
            await Drive.deleteMany({ product: id }, opts);
            break;
          }
          case "cooler": {
            const { Cooler } = await import("../components/models/cooler.model");
            await Cooler.deleteMany({ product: id }, opts);
            break;
          }
          case "motherboard": {
            const { Motherboard } = await import("../components/models/motherboard.model");
            await Motherboard.deleteMany({ product: id }, opts);
            break;
          }
          case "monitor": {
            const { Monitor } = await import("../components/models/monitor.model");
            await Monitor.deleteMany({ product: id }, opts);
            break;
          }
          case "pc": {
            const { PC } = await import("../components/models/pc.model");
            await PC.deleteMany({ product: id }, opts);
            break;
          }
          case "laptop": {
            const { Laptop } = await import("../components/laptop/models/laptop.model");
            await Laptop.deleteMany({ product: id }, opts);
            const { CPULaptop } = await import("../components/laptop/models/cpu-laptop.model");
            await CPULaptop.deleteMany({ product: id }, opts);
            const { DriveLaptop } = await import("../components/laptop/models/drive-laptop.model");
            await DriveLaptop.deleteMany({ product: id }, opts);
            const { GPULaptop } = await import("../components/laptop/models/gpu-laptop.model");
            await GPULaptop.deleteMany({ product: id }, opts);
            const { NetworkCardLaptop } = await import("../components/laptop/models/networdCard-laptop.model");
            await NetworkCardLaptop.deleteMany({ product: id }, opts);
            const { RAMLaptop } = await import("../components/laptop/models/ram-laptop.model");
            await RAMLaptop.deleteMany({ product: id }, opts);
            break;
          }
          case "case": {
            const { Case } = await import("../components/models/case.model");
            await Case.deleteMany({ product: id }, opts);
            break;
          }
          case "mouse": {
            const { Mouse } = await import("../components/models/mouse.model");
            await Mouse.deleteMany({ product: id }, opts);
            break;
          }
          case "keyboard": {
            const { Keyboard } = await import("../components/models/keyboard.model");
            await Keyboard.deleteMany({ product: id }, opts);
            break;
          }
          case "network-card": {
            const { NetworkCard } = await import("../components/models/networkCard.model");
            await NetworkCard.deleteMany({ product: id }, opts);
            break;
          }
          case "headset": {
            const { Headset } = await import("../components/models/headset.model");
            await Headset.deleteMany({ product: id }, opts);
            break;
          }
          default:
            break;
        }
      }

      // 2. Xoá ảnh
      const { Image } = await import("../../image/models/image.model");
      try {
        await Image.deleteMany({ product: id }, opts);
      } catch (err) {
        // Error deleting Images: err
      }

      // 3. Xoá feedback
      const { Feedback } = await import("../../feedback/models/feedback.model");
      try {
        await Feedback.deleteMany({ product: id }, opts);
      } catch (err) {
        // Error deleting Feedback: err
      }

      // 4. Xoá cartItem
      const { CartItem } = await import("../../cart/models/cartItem.model");
      try {
        await CartItem.deleteMany({ product: id }, opts);
      } catch (err) {
        // Error deleting CartItem: err
      }

      // 5. Xoá orderDetail
      const { OrderDetail } = await import("../../order/models/orderDetail.model");
      try {
        await OrderDetail.deleteMany({ product: id }, opts);
      } catch (err) {
        // Error deleting OrderDetail: err
      }

      // 6. Xoá chính Product
      try {
        await Product.deleteOne({ _id: id }, opts);
      } catch (err) {
        // Error deleting Product: err
      }

      return true;
    });
  }

  async searchProducts(keyword: string): Promise<any[]> {
    if (!keyword || keyword.trim() === "") {
      throw new BadRequestException("Search keyword is required");
    }
    const regex = new RegExp(escapeRegex(keyword.trim()), "i");
    const matchingCategories = await Category.find({ name: regex }).select("_id");
    const categoryIds = matchingCategories.map((c) => c._id);

    const products = await Product.find({
      isActive: true,
      $or: [
        { name: regex },
        { description: regex },
        { categoryId: { $in: categoryIds } },
      ],
    })
      .populate("category")
      .populate("images")
      .sort({ createdAt: -1 });
    return this.attachStock(products);
  }

  async getProductsByMainCategory(categoryId: string, limit: number = 8): Promise<any[]> {
    await this.getCategoryById(categoryId); // Validate category exists

    const products = await Product.find({ isActive: true, categoryId })
      .populate("category")
      .sort({ createdAt: -1 })
      .limit(limit);
    return this.attachStock(products);
  }

  async getAllCategories(): Promise<CategoryDocument[]> {
    return await Category.find().sort({ name: 1 });
  }

  async getProductsByMultipleCategories(categoryIds: string[], limit: number = 8): Promise<any[]> {
    await this.getCategoriesByIds(categoryIds); // Validate categories exist

    const products = await Product.find({
      isActive: true,
      categoryId: { $in: categoryIds },
    })
      .populate("category")
      .sort({ createdAt: -1 })
      .limit(limit);
    return this.attachStock(products);
  }

  async getProductsByCategoryName(categoryName: string, limit: number = 8): Promise<any[]> {
    const category = await this.getCategoryByName(categoryName);

    const products = await Product.find({ isActive: true, categoryId: category._id })
      .populate("category")
      .sort({ createdAt: -1 })
      .limit(limit);
    return this.attachStock(products);
  }

  async getProductsByType(type: "laptop" | "pc" | "accessories", limit: number = 8): Promise<ProductDocument[]> {
    switch (type) {
      case "laptop":
        return this.getNewLaptops(limit);
      case "pc":
        return this.getNewPCs(limit);
      case "accessories":
        return this.getNewAccessories(limit);
      default:
        throw new BadRequestException(
          "Invalid product type. Must be laptop, pc, or accessories"
        );
    }
  }

  async getProductsByCategoryId(categoryId: string, limit: number = 8): Promise<any[]> {
    await this.getCategoryById(categoryId); // Validate category exists

    const products = await Product.find({ isActive: true, categoryId })
      .populate("category")
      .sort({ createdAt: -1 })
      .limit(limit);
    return this.attachStock(products);
  }

  async getAllProductsIncludingOutOfStock(): Promise<any[]> {
    const products = await Product.find()
      .populate("category")
      .populate("images")
      .sort({ createdAt: -1 })
      .setOptions({ withDeleted: true });
    return this.attachStock(products);
  }

  async getOutOfStockProducts(): Promise<any[]> {
    const products = await Product.find({ isActive: true })
      .populate("category")
      .sort({ createdAt: -1 });
    const withStock = await this.attachStock(products);
    return withStock.filter((p) => p.stock === 0);
  }
}

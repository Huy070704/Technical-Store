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
    const products = await Product.find({ isActive: true})
      .populate("category")
      .populate("images")
      .sort({ createdAt: -1 });
    return this.attachStock(products);
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
    const products = await Product.find({ isActive: true})
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

    const detail = await this.loadComponentDetail(categoryKey(category), id);
    const stockMap = await this.getStockMap([product._id]);
    return { ...mergeDetail(product, detail), stock: stockMap.get(product._id.toString()) ?? 0 };
  }

  /** Admin / nội bộ: không lọc stock. */
  async getProductByIdForAdmin(id: string): Promise<any | null> {
    const product = await Product.findById(id)
      .populate("category")
      .populate("images");
    if (!product) {
      throw new EntityNotFoundException("Product not found");
    }
    const category = product.category;
    if (!category) {
      throw new BadRequestException("Product category not found");
    }
    const detail = await this.loadComponentDetail(categoryKey(category), id);
    const stockMap = await this.getStockMap([product._id]);
    return { ...mergeDetail(product, detail), stock: stockMap.get(product._id.toString()) ?? 0 };
  }

  async getProductByName(name: string): Promise<any | null> {
    const product = await Product.findOne({ name, isActive: true}).populate(
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
      Object.assign(product, createProductDto);
      // Set isActive theo stock
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
      Object.assign(product, productFields);

      await product.save({ session: session ?? undefined });
      const withCategory = await Product.findById(product._id)
        .populate("category")
        .session(session ?? null);
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

  private async updateRAMDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { RAM } = await import("../components/models/ram.model");
    const ram = await this.findOrCreateComponent(RAM, product, session);
    if (updateData.brand !== undefined) ram.brand = updateData.brand;
    if (updateData.model !== undefined) ram.model = updateData.model;
    if (updateData.capacityGb !== undefined) ram.capacityGb = updateData.capacityGb;
    if (updateData.speedMhz !== undefined) ram.speedMhz = updateData.speedMhz;
    if (updateData.type !== undefined) ram.type = updateData.type;
    try {
      await ram.save({ session: session ?? undefined });
    } catch (err) {
      throw new Error("Không thể lưu thông tin RAM cho sản phẩm");
    }
  }

  private async updateLaptopDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Laptop } = await import("../components/laptop/models/laptop.model");
    const laptop = await this.findOrCreateComponent(Laptop, product, session);
    if (updateData.brand !== undefined) laptop.brand = updateData.brand;
    if (updateData.model !== undefined) laptop.model = updateData.model;
    if (updateData.screenSize !== undefined) laptop.screenSize = updateData.screenSize;
    if (updateData.screenType !== undefined) laptop.screenType = updateData.screenType;
    if (updateData.resolution !== undefined) laptop.resolution = updateData.resolution;
    if (updateData.batteryLifeHours !== undefined) laptop.batteryLifeHours = updateData.batteryLifeHours;
    if (updateData.weightKg !== undefined) laptop.weightKg = updateData.weightKg;
    if (updateData.os !== undefined) laptop.os = updateData.os;
    if (updateData.ramCount !== undefined) laptop.ramCount = updateData.ramCount;
    try {
      await laptop.save({ session: session ?? undefined });
    } catch (err) {
      throw new Error("Không thể lưu thông tin Laptop cho sản phẩm");
    }
  }

  private async updateCPUDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { CPU } = await import("../components/models/cpu.model");
    const cpu = await this.findOrCreateComponent(CPU, product, session);
    if (updateData.cores !== undefined) cpu.cores = updateData.cores;
    if (updateData.threads !== undefined) cpu.threads = updateData.threads;
    if (updateData.baseClock !== undefined) cpu.baseClock = updateData.baseClock;
    if (updateData.boostClock !== undefined) cpu.boostClock = updateData.boostClock;
    if (updateData.socket !== undefined) cpu.socket = updateData.socket;
    if (updateData.architecture !== undefined) cpu.architecture = updateData.architecture;
    if (updateData.tdp !== undefined) cpu.tdp = updateData.tdp;
    if (updateData.integratedGraphics !== undefined) cpu.integratedGraphics = updateData.integratedGraphics;
    try {
      await cpu.save({ session: session ?? undefined });
    } catch (err) {
      throw new Error("Không thể lưu thông tin CPU cho sản phẩm");
    }
  }

  private async updateGPUDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { GPU } = await import("../components/models/gpu.model");
    const gpu = await this.findOrCreateComponent(GPU, product, session);
    if (updateData.brand !== undefined) gpu.brand = updateData.brand;
    if (updateData.model !== undefined) gpu.model = updateData.model;
    if (updateData.vram !== undefined) gpu.vram = updateData.vram;
    if (updateData.chipset !== undefined) gpu.chipset = updateData.chipset;
    if (updateData.memoryType !== undefined) gpu.memoryType = updateData.memoryType;
    if (updateData.lengthMm !== undefined) gpu.lengthMm = updateData.lengthMm;
    try {
      await gpu.save({ session: session ?? undefined });
    } catch (err) {
      throw new Error("Không thể lưu thông tin GPU cho sản phẩm");
    }
  }

  private async updateMonitorDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Monitor } = await import("../components/models/monitor.model");
    const monitor = await this.findOrCreateComponent(Monitor, product, session);
    if (updateData.brand !== undefined) monitor.brand = updateData.brand;
    if (updateData.model !== undefined) monitor.model = updateData.model;
    if (updateData.sizeInch !== undefined) monitor.sizeInch = updateData.sizeInch;
    if (updateData.resolution !== undefined) monitor.resolution = updateData.resolution;
    if (updateData.panelType !== undefined) monitor.panelType = updateData.panelType;
    if (updateData.refreshRate !== undefined) monitor.refreshRate = updateData.refreshRate;
    try {
      await monitor.save({ session: session ?? undefined });
    } catch (err) {
      throw new Error("Không thể lưu thông tin Monitor cho sản phẩm");
    }
  }

  private async updateMotherboardDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Motherboard } = await import("../components/models/motherboard.model");
    const motherboard = await this.findOrCreateComponent(Motherboard, product, session);
    if (updateData.brand !== undefined) motherboard.brand = updateData.brand;
    if (updateData.model !== undefined) motherboard.model = updateData.model;
    if (updateData.socket !== undefined) motherboard.socket = updateData.socket;
    if (updateData.chipset !== undefined) motherboard.chipset = updateData.chipset;
    if (updateData.formFactor !== undefined) motherboard.formFactor = updateData.formFactor;
    if (updateData.ramSlots !== undefined) motherboard.ramSlots = updateData.ramSlots;
    if (updateData.maxRam !== undefined) motherboard.maxRam = updateData.maxRam;
    try {
      await motherboard.save({ session: session ?? undefined });
    } catch (err) {
      throw new Error("Không thể lưu thông tin Motherboard cho sản phẩm");
    }
  }

  private async updatePSUDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { PSU } = await import("../components/models/psu.model");
    const psu = await this.findOrCreateComponent(PSU, product, session);
    if (updateData.brand !== undefined) psu.brand = updateData.brand;
    if (updateData.model !== undefined) psu.model = updateData.model;
    if (updateData.wattage !== undefined) psu.wattage = updateData.wattage;
    try {
      await psu.save({ session: session ?? undefined });
    } catch (err) {
      throw new Error("Không thể lưu thông tin PSU cho sản phẩm");
    }
  }

  private async updateDriveDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Drive } = await import("../components/models/drive.model");
    const drive = await this.findOrCreateComponent(Drive, product, session);
    if (updateData.brand !== undefined) drive.brand = updateData.brand;
    if (updateData.model !== undefined) drive.model = updateData.model;
    if (updateData.type !== undefined) drive.type = updateData.type;
    if (updateData.capacityGb !== undefined) drive.capacityGb = updateData.capacityGb;
    if (updateData.interface !== undefined) drive.interface = updateData.interface;
    await drive.save({ session: session ?? undefined });
  }

  private async updateCoolerDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Cooler } = await import("../components/models/cooler.model");
    const cooler = await this.findOrCreateComponent(Cooler, product, session);
    if (updateData.brand !== undefined) cooler.brand = updateData.brand;
    if (updateData.model !== undefined) cooler.model = updateData.model;
    if (updateData.type !== undefined) cooler.type = updateData.type;
    if (updateData.supportedSockets !== undefined) cooler.supportedSockets = updateData.supportedSockets;
    if (updateData.fanSizeMm !== undefined) cooler.fanSizeMm = updateData.fanSizeMm;
    await cooler.save({ session: session ?? undefined });
  }

  private async updatePCDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { PC } = await import("../components/models/pc.model");
    const pc = await this.findOrCreateComponent(PC, product, session);
    if (updateData.brand !== undefined) pc.brand = updateData.brand;
    if (updateData.model !== undefined) pc.model = updateData.model;
    if (updateData.processor !== undefined) pc.processor = updateData.processor;
    if (updateData.ramGb !== undefined) pc.ramGb = updateData.ramGb;
    if (updateData.storageGb !== undefined) pc.storageGb = updateData.storageGb;
    if (updateData.storageType !== undefined) pc.storageType = updateData.storageType;
    if (updateData.graphics !== undefined) pc.graphics = updateData.graphics;
    if (updateData.formFactor !== undefined) pc.formFactor = updateData.formFactor;
    if (updateData.powerSupplyWattage !== undefined) pc.powerSupplyWattage = updateData.powerSupplyWattage;
    if (updateData.operatingSystem !== undefined) pc.operatingSystem = updateData.operatingSystem;
    await pc.save({ session: session ?? undefined });
  }

  private async updateNetworkCardDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { NetworkCard } = await import("../components/models/networkCard.model");
    const nc = await this.findOrCreateComponent(NetworkCard, product, session);
    if (updateData.type !== undefined) nc.type = updateData.type;
    if (updateData.interface !== undefined) nc.interface = updateData.interface;
    if (updateData.speedMbps !== undefined) nc.speedMbps = updateData.speedMbps;
    await nc.save({ session: session ?? undefined });
  }

  private async updateCaseDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Case } = await import("../components/models/case.model");
    const c = await this.findOrCreateComponent(Case, product, session);
    if (updateData.brand !== undefined) c.brand = updateData.brand;
    if (updateData.model !== undefined) c.model = updateData.model;
    if (updateData.formFactorSupport !== undefined) c.formFactorSupport = updateData.formFactorSupport;
    if (updateData.hasRgb !== undefined) c.hasRgb = updateData.hasRgb;
    if (updateData.sidePanelType !== undefined) c.sidePanelType = updateData.sidePanelType;
    if (updateData.maxGpuLengthMm !== undefined) c.maxGpuLengthMm = updateData.maxGpuLengthMm;
    if (updateData.psuType !== undefined) c.psuType = updateData.psuType;
    await c.save({ session: session ?? undefined });
  }

  private async updateMouseDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Mouse } = await import("../components/models/mouse.model");
    const m = await this.findOrCreateComponent(Mouse, product, session);
    if (updateData.type !== undefined) m.type = updateData.type;
    if (updateData.dpi !== undefined) m.dpi = updateData.dpi;
    if (updateData.connectivity !== undefined) m.connectivity = updateData.connectivity;
    if (updateData.hasRgb !== undefined) m.hasRgb = updateData.hasRgb;
    await m.save({ session: session ?? undefined });
  }

  private async updateKeyboardDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Keyboard } = await import("../components/models/keyboard.model");
    const k = await this.findOrCreateComponent(Keyboard, product, session);
    if (updateData.type !== undefined) k.type = updateData.type;
    if (updateData.switchType !== undefined) k.switchType = updateData.switchType;
    if (updateData.connectivity !== undefined) k.connectivity = updateData.connectivity;
    if (updateData.layout !== undefined) k.layout = updateData.layout;
    if (updateData.hasRgb !== undefined) k.hasRgb = updateData.hasRgb;
    await k.save({ session: session ?? undefined });
  }

  private async updateHeadsetDetails(session: ClientSession | undefined, product: ProductDocument, updateData: any): Promise<void> {
    const { Headset } = await import("../components/models/headset.model");
    const h = await this.findOrCreateComponent(Headset, product, session);
    if (updateData.hasMicrophone !== undefined) h.hasMicrophone = updateData.hasMicrophone;
    if (updateData.connectivity !== undefined) h.connectivity = updateData.connectivity;
    if (updateData.surroundSound !== undefined) h.surroundSound = updateData.surroundSound;
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
      .sort({ createdAt: -1 });
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

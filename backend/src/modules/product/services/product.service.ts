import { Service } from "typedi";
import { Product } from "../product.entity";
import { Category } from "../category.entity";
import { CreateProductDto, UpdateProductDto } from "../dtos/product.dto";
import {
  EntityNotFoundException,
  BadRequestException,
} from "@/shared/exceptions/http-exceptions";
import { EntityManager, Not, In, MoreThan } from "typeorm";
import { categoryKey } from "../utils/categoryKey";
import { DbConnection } from "@/database/dbConnection";

@Service()
export class ProductService {

  private async getCategoryById(id: string): Promise<Category> {
    const category = await Category.findOne({ where: { id } });
    if (!category) {
      throw new EntityNotFoundException(`Category with id '${id}' not found`);
    }
    return category;
  }

  private async getCategoryByName(name: string): Promise<Category> {
    const category = await Category.findOne({ where: { name } });
    if (!category) {
      throw new EntityNotFoundException(
        `Category with name '${name}' not found`
      );
    }
    return category;
  }

  private async getCategoriesByIds(ids: string[]): Promise<Category[]> {
    const categories = await Category.find({ where: { id: In(ids) } });
    if (categories.length !== ids.length) {
      const foundIds = categories.map((cat) => cat.id);
      const missingIds = ids.filter((id) => !foundIds.includes(id));
      throw new EntityNotFoundException(
        `Categories not found: ${missingIds.join(", ")}`
      );
    }
    return categories;
  }

  private async getCategoriesByNames(names: string[]): Promise<Category[]> {
    const categories = await Category.find({
      where: { name: In(names) },
    });
    if (categories.length !== names.length) {
      const foundNames = categories.map((cat) => cat.name).filter(Boolean);
      const missingNames = names.filter((name) => !foundNames.includes(name));
      throw new EntityNotFoundException(
        `Categories not found: ${missingNames.join(", ")}`
      );
    }
    return categories;
  }

  async getAllProducts(): Promise<Product[]> {
    return await Product.find({
      where: {
        isActive: true,
        stock: MoreThan(0),
      },
      relations: ["category", "images"],
      order: { createdAt: "DESC" },
    });
  }

  async getNewLaptops(limit: number = 8): Promise<Product[]> {
    // Truy vấn category Laptop theo tên chính xác
    const laptopCategory = await this.getCategoryByName("Laptop");

    return await Product.find({
      where: {
        isActive: true,
        stock: MoreThan(0),
        categoryId: laptopCategory.id,
      },
      relations: ["category", "images"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async getNewPCs(limit: number = 8): Promise<Product[]> {
    // Truy vấn category PC theo tên chính xác
    const pcCategory = await this.getCategoryByName("PC");

    return await Product.find({
      where: {
        isActive: true,
        stock: MoreThan(0),
        categoryId: pcCategory.id,
      },
      relations: ["category", "images"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  async getNewAccessories(limit: number = 8): Promise<Product[]> {
    // Truy vấn categories Laptop và PC theo tên chính xác để loại trừ
    const [laptopCategory, pcCategory] = await this.getCategoriesByNames([
      "Laptop",
      "PC",
    ]);

    return await Product.createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "category")
      .leftJoinAndSelect("product.images", "images")
      .where("product.isActive = :isActive", { isActive: true })
      .andWhere("product.stock > :stock", { stock: 0 })
      .andWhere("product.categoryId NOT IN (:...ids)", {
        ids: [laptopCategory.id, pcCategory.id],
      })
      .orderBy("product.createdAt", "DESC")
      .take(limit)
      .getMany();
  }

  async getNewProducts(limit: number = 8) {
    const [laptops, pcs, accessories] = await Promise.all([
      this.getNewLaptops(limit),
      this.getNewPCs(limit),
      this.getNewAccessories(limit),
    ]);
    return { laptops, pcs, accessories };
  }

  async getTopSellingProducts(limit: number = 6): Promise<Product[]> {
    // For now, return products with highest stock (as a proxy for popularity)
    // In a real application, this would be based on actual sales data
    return await Product.find({
      where: {
        isActive: true,
        stock: MoreThan(0),
      },
      relations: ["category", "images"],
      order: { stock: "DESC" },
      take: limit,
    });
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    await this.getCategoryById(categoryId); // Validate category exists

    return await Product.find({
      where: {
        isActive: true,
        stock: MoreThan(0),
        categoryId: categoryId,
      },
      relations: ["category"],
      order: { createdAt: "DESC" },
    });
  }

  async getProductById(id: string): Promise<any | null> {
    const product = await Product.findOne({
      where: {
        id,
        isActive: true,
        stock: MoreThan(0),
      },
      relations: ["category", "images"],
    });

    if (!product) {
      throw new EntityNotFoundException("Product not found or out of stock");
    }

    let detail = null;
    const categoryId = product.categoryId;

    if (!categoryId) {
      throw new BadRequestException("Product category not found");
    }

    // Lấy category để xác định loại component
    const category = await Category.findOne({ where: { id: categoryId } });
    if (!category || !category.name) {
      throw new BadRequestException("Product category not found");
    }

    // Import các component entities khi cần dựa trên category name chính xác
    switch (categoryKey(category)) {
      case "cpu":
        const { CPU } = await import("../components/cpu.entity");
        detail = await CPU.findOne({
          where: { product: { id } },
          relations: ["product"],
        });
        break;
      case "laptop":
        const { Laptop } = await import("../components/laptop/laptop.entity");
        detail = await Laptop.findOne({
          where: { product: { id } },
          relations: ["product"],
        });
        break;
      case "pc":
        const { PC } = await import("../components/pc.entity");
        detail = await PC.findOne({
          where: { product: { id } },
          relations: ["product"],
        });
        break;
      case "ram":
        const { RAM } = await import("../components/ram.entity");
        detail = await RAM.findOne({
          where: { product: { id } },
          relations: ["product"],
        });
        break;
      case "gpu":
        const { GPU } = await import("../components/gpu.entity");
        detail = await GPU.findOne({
          where: { product: { id } },
          relations: ["product"],
        });
        break;
      case "psu":
        const { PSU } = await import("../components/psu.entity");
        detail = await PSU.findOne({
          where: { product: { id } },
          relations: ["product"],
        });
        break;
      case "drive":
        const { Drive } = await import("../components/drive.entity");
        detail = await Drive.findOne({
          where: { product: { id } },
          relations: ["product"],
        });
        break;
      case "motherboard":
        const { Motherboard } = await import("../components/motherboard.entity");
        detail = await Motherboard.findOne({
          where: { product: { id } },
          relations: ["product"],
        });
        break;
      case "cooler":
        const { Cooler } = await import("../components/cooler.entity");
        detail = await Cooler.findOne({
          where: { product: { id } },
          relations: ["product"],
        });
        break;
      case "case":
        const { Case } = await import("../components/case.entity");
        detail = await Case.findOne({
          where: { product: { id } },
          relations: ["product"],
        });
        break;
      case "monitor":
        const { Monitor } = await import("../components/monitor.entity");
        detail = await Monitor.findOne({
          where: { product: { id } },
          relations: ["product"],
        });
        break;
      case "mouse":
        const { Mouse } = await import("../components/mouse.entity");
        detail = await Mouse.findOne({
          where: { product: { id } },
          relations: ["product"],
        });
        break;
      case "network-card":
        const { NetworkCard } = await import("../components/networkCard.entity");
        detail = await NetworkCard.findOne({
          where: { product: { id } },
          relations: ["product"],
        });
        break;
      case "headset":
        const { Headset } = await import("../components/headset.entity");
        detail = await Headset.findOne({
          where: { product: { id } },
          relations: ["product"],
        });
        break;
      case "keyboard":
        const { Keyboard } = await import("../components/keyboard.entity");
        detail = await Keyboard.findOne({
          where: { product: { id } },
          relations: ["product"],
        });
        break;
    }

    // Nếu có detail, gộp các trường chi tiết vào product (bỏ các trường không cần thiết)
    if (detail) {
      const { id, createdAt, updatedAt, product: _prod, ...fields } = detail;
      Object.assign(product, fields);
    }

    return product;
  }

  /** Admin / nội bộ: không lọc stock. */
  async getProductByIdForAdmin(id: string): Promise<any | null> {
    const product = await Product.findOne({
      where: { id },
      relations: ["category", "images"],
    });
    if (!product) {
      throw new EntityNotFoundException("Product not found");
    }
    const category = product.category;
    if (!category) {
      throw new BadRequestException("Product category not found");
    }
    let detail = null;
    switch (categoryKey(category)) {
      case "cpu": {
        const { CPU } = await import("../components/cpu.entity");
        detail = await CPU.findOne({ where: { product: { id } }, relations: ["product"] });
        break;
      }
      case "laptop": {
        const { Laptop } = await import("../components/laptop/laptop.entity");
        detail = await Laptop.findOne({ where: { product: { id } }, relations: ["product"] });
        break;
      }
      case "pc": {
        const { PC } = await import("../components/pc.entity");
        detail = await PC.findOne({ where: { product: { id } }, relations: ["product"] });
        break;
      }
      case "ram": {
        const { RAM } = await import("../components/ram.entity");
        detail = await RAM.findOne({ where: { product: { id } }, relations: ["product"] });
        break;
      }
      case "gpu": {
        const { GPU } = await import("../components/gpu.entity");
        detail = await GPU.findOne({ where: { product: { id } }, relations: ["product"] });
        break;
      }
      case "psu": {
        const { PSU } = await import("../components/psu.entity");
        detail = await PSU.findOne({ where: { product: { id } }, relations: ["product"] });
        break;
      }
      case "drive": {
        const { Drive } = await import("../components/drive.entity");
        detail = await Drive.findOne({ where: { product: { id } }, relations: ["product"] });
        break;
      }
      case "motherboard": {
        const { Motherboard } = await import("../components/motherboard.entity");
        detail = await Motherboard.findOne({ where: { product: { id } }, relations: ["product"] });
        break;
      }
      case "cooler": {
        const { Cooler } = await import("../components/cooler.entity");
        detail = await Cooler.findOne({ where: { product: { id } }, relations: ["product"] });
        break;
      }
      case "case": {
        const { Case } = await import("../components/case.entity");
        detail = await Case.findOne({ where: { product: { id } }, relations: ["product"] });
        break;
      }
      case "monitor": {
        const { Monitor } = await import("../components/monitor.entity");
        detail = await Monitor.findOne({ where: { product: { id } }, relations: ["product"] });
        break;
      }
      case "mouse": {
        const { Mouse } = await import("../components/mouse.entity");
        detail = await Mouse.findOne({ where: { product: { id } }, relations: ["product"] });
        break;
      }
      case "network-card": {
        const { NetworkCard } = await import("../components/networkCard.entity");
        detail = await NetworkCard.findOne({ where: { product: { id } }, relations: ["product"] });
        break;
      }
      case "headset": {
        const { Headset } = await import("../components/headset.entity");
        detail = await Headset.findOne({ where: { product: { id } }, relations: ["product"] });
        break;
      }
      case "keyboard": {
        const { Keyboard } = await import("../components/keyboard.entity");
        detail = await Keyboard.findOne({ where: { product: { id } }, relations: ["product"] });
        break;
      }
    }
    if (detail) {
      const { id: _id, createdAt, updatedAt, product: _prod, ...fields } = detail;
      Object.assign(product, fields);
    }
    return product;
  }

  async getProductByName(name: string): Promise<Product | null> {
    return await Product.findOne({
      where: {
        name,
        isActive: true,
        stock: MoreThan(0),
      },
      relations: ["category"],
    });
  }

  async createProduct(createProductDto: CreateProductDto): Promise<Product> {
    return DbConnection.appDataSource.manager.transaction(
      async (transactionalEntityManager: EntityManager) => {
        // Validate category exists
        const category = await Category.findOne({
          where: { id: createProductDto.categoryId },
        });
        if (!category) {
          throw new EntityNotFoundException(
            `Category with id '${createProductDto.categoryId}' not found`
          );
        }

        // Validate price and stock
        if (createProductDto.price <= 0) {
          throw new BadRequestException("Price must be greater than 0");
        }

        if (createProductDto.stock < 0) {
          throw new BadRequestException("Stock cannot be negative");
        }

        // Check if product with same name already exists
        const existingProduct = await Product.findOne({
          where: { name: createProductDto.name },
        });

        if (existingProduct) {
          throw new BadRequestException(
            "Product with this name already exists"
          );
        }

        const product = new Product();
        Object.assign(product, createProductDto);
        // Set isActive theo stock
        if (createProductDto.stock > 0) {
          product.isActive = true;
        } else {
          product.isActive = false;
        }

        const savedProduct = await transactionalEntityManager.save(product);
        // Load lại product kèm category
        const savedProductWithCategory =
          await transactionalEntityManager.findOne(Product, {
            where: { id: savedProduct.id },
            relations: ["category"],
          });
        if (!savedProductWithCategory) {
          throw new Error("Cannot load product with category after save");
        }
        // Lưu vào bảng component đặc thù nếu có
        try {
          await this.updateComponentDetails(
            transactionalEntityManager,
            savedProductWithCategory,
            createProductDto
          );
        } catch (componentError) {
          throw new BadRequestException(
            "Lỗi khi lưu vào bảng component đặc thù: " + String(componentError)
          );
        }
        return savedProductWithCategory;
      }
    );
  }

  async updateProduct(
    id: string,
    updateProductDto: any
  ): Promise<Product | null> {
    return DbConnection.appDataSource.manager.transaction(
      async (transactionalEntityManager: EntityManager) => {
        const product = await Product.findOne({
          where: { id },
          relations: ["category"],
        });
        if (!product) {
          throw new EntityNotFoundException("Product");
        }

        // Extract product fields and component fields
        const productFields = {
          name: updateProductDto.name,
          description: updateProductDto.description,
          price: updateProductDto.price,
          stock: updateProductDto.stock,
          categoryId: updateProductDto.categoryId,
          isActive: updateProductDto.isActive,
          url: updateProductDto.url,
        };

        // Remove undefined fields
        Object.keys(productFields).forEach((key) => {
          if ((productFields as any)[key] === undefined) {
            delete (productFields as any)[key];
          }
        });

        // Validate category if provided
        if (productFields.categoryId) {
          const category = await Category.findOne({
            where: { id: productFields.categoryId },
          });
          if (!category) {
            throw new EntityNotFoundException("Category");
          }
          product.category = category;
        }

        // Validate price if provided
        if (productFields.price !== undefined && productFields.price <= 0) {
          throw new BadRequestException("Price must be greater than 0");
        }

        // Validate stock if provided
        if (productFields.stock !== undefined && productFields.stock < 0) {
          throw new BadRequestException("Stock cannot be negative");
        }

        // Check if product with same name already exists (excluding current product)
        if (productFields.name) {
          const existingProduct = await Product.findOne({
            where: { name: productFields.name, id: Not(id) },
          });

          if (existingProduct) {
            throw new BadRequestException(
              "Product with this name already exists"
            );
          }
        }

        // Update product basic fields
        Object.assign(product, productFields);

        const updatedProduct = await transactionalEntityManager.save(product);
        const withCategory = await transactionalEntityManager.findOne(Product, {
          where: { id: updatedProduct.id },
          relations: ["category"],
        });
        if (!withCategory) {
          throw new EntityNotFoundException("Product");
        }
        await this.updateComponentDetails(
          transactionalEntityManager,
          withCategory,
          updateProductDto
        );
        return withCategory;
      }
    );
  }

  private async updateComponentDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const category = product.category;
    if (!category || !category.name) return;
    switch (categoryKey(category)) {
      case "laptop":
        await this.updateLaptopDetails(
          transactionalEntityManager,
          product,
          updateData
        );
        break;
      case "ram":
        await this.updateRAMDetails(
          transactionalEntityManager,
          product,
          updateData
        );
        break;
      case "cpu":
        await this.updateCPUDetails(
          transactionalEntityManager,
          product,
          updateData
        );
        break;
      case "gpu":
        await this.updateGPUDetails(
          transactionalEntityManager,
          product,
          updateData
        );
        break;
      case "monitor":
        await this.updateMonitorDetails(
          transactionalEntityManager,
          product,
          updateData
        );
        break;
      case "motherboard":
        await this.updateMotherboardDetails(
          transactionalEntityManager,
          product,
          updateData
        );
        break;
      case "psu":
        await this.updatePSUDetails(
          transactionalEntityManager,
          product,
          updateData
        );
        break;
      case "drive":
        await this.updateDriveDetails(
          transactionalEntityManager,
          product,
          updateData
        );
        break;
      case "cooler":
        await this.updateCoolerDetails(
          transactionalEntityManager,
          product,
          updateData
        );
        break;
      case "pc":
        await this.updatePCDetails(
          transactionalEntityManager,
          product,
          updateData
        );
        break;
      case "network-card":
        await this.updateNetworkCardDetails(
          transactionalEntityManager,
          product,
          updateData
        );
        break;
      case "case":
        await this.updateCaseDetails(
          transactionalEntityManager,
          product,
          updateData
        );
        break;
      case "mouse":
        await this.updateMouseDetails(
          transactionalEntityManager,
          product,
          updateData
        );
        break;
      case "keyboard":
        await this.updateKeyboardDetails(
          transactionalEntityManager,
          product,
          updateData
        );
        break;
      case "headset":
        await this.updateHeadsetDetails(
          transactionalEntityManager,
          product,
          updateData
        );
        break;
      default:
        // For other categories, no component-specific update needed
        break;
    }
  }

  private async updateRAMDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const { RAM } = await import("../components/ram.entity");
    let ram = await RAM.findOne({
      where: { product: { id: product.id } },
    });
    if (!ram) {
      ram = new RAM();
      ram.product = product;
    }
    // Update RAM-specific fields
    if (updateData.brand !== undefined) ram.brand = updateData.brand;
    if (updateData.model !== undefined) ram.model = updateData.model;
    if (updateData.capacityGb !== undefined)
      ram.capacityGb = updateData.capacityGb;
    if (updateData.speedMhz !== undefined) ram.speedMhz = updateData.speedMhz;
    if (updateData.type !== undefined) ram.type = updateData.type;
    try {
      await transactionalEntityManager.save(ram);
    } catch (err) {
      throw new Error("Không thể lưu thông tin RAM cho sản phẩm");
    }
  }

  private async updateLaptopDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const { Laptop } = await import("../components/laptop/laptop.entity");
    let laptop = await Laptop.findOne({
      where: { product: { id: product.id } },
    });
    if (!laptop) {
      laptop = new Laptop();
      laptop.product = product;
    }
    // Update laptop-specific fields
    if (updateData.brand !== undefined) laptop.brand = updateData.brand;
    if (updateData.model !== undefined) laptop.model = updateData.model;
    if (updateData.screenSize !== undefined)
      laptop.screenSize = updateData.screenSize;
    if (updateData.screenType !== undefined)
      laptop.screenType = updateData.screenType;
    if (updateData.resolution !== undefined)
      laptop.resolution = updateData.resolution;
    if (updateData.batteryLifeHours !== undefined)
      laptop.batteryLifeHours = updateData.batteryLifeHours;
    if (updateData.weightKg !== undefined)
      laptop.weightKg = updateData.weightKg;
    if (updateData.os !== undefined) laptop.os = updateData.os;
    if (updateData.ramCount !== undefined)
      laptop.ramCount = updateData.ramCount;
    try {
      await transactionalEntityManager.save(laptop);
    } catch (err) {
      throw new Error("Không thể lưu thông tin Laptop cho sản phẩm");
    }
  }

  private async updateCPUDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const { CPU } = await import("../components/cpu.entity");
    let cpu = await CPU.findOne({
      where: { product: { id: product.id } },
    });
    if (!cpu) {
      cpu = new CPU();
      cpu.product = product;
    }
    // Update CPU-specific fields
    if (updateData.cores !== undefined) cpu.cores = updateData.cores;
    if (updateData.threads !== undefined) cpu.threads = updateData.threads;
    if (updateData.baseClock !== undefined)
      cpu.baseClock = updateData.baseClock;
    if (updateData.boostClock !== undefined)
      cpu.boostClock = updateData.boostClock;
    if (updateData.socket !== undefined) cpu.socket = updateData.socket;
    if (updateData.architecture !== undefined)
      cpu.architecture = updateData.architecture;
    if (updateData.tdp !== undefined) cpu.tdp = updateData.tdp;
    if (updateData.integratedGraphics !== undefined)
      cpu.integratedGraphics = updateData.integratedGraphics;
    try {
      await transactionalEntityManager.save(cpu);
    } catch (err) {
      throw new Error("Không thể lưu thông tin CPU cho sản phẩm");
    }
  }

  private async updateGPUDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const { GPU } = await import("../components/gpu.entity");
    let gpu = await GPU.findOne({
      where: { product: { id: product.id } },
    });
    if (!gpu) {
      gpu = new GPU();
      gpu.product = product;
    }
    // Update GPU-specific fields
    if (updateData.brand !== undefined) gpu.brand = updateData.brand;
    if (updateData.model !== undefined) gpu.model = updateData.model;
    if (updateData.vram !== undefined) gpu.vram = updateData.vram;
    if (updateData.chipset !== undefined) gpu.chipset = updateData.chipset;
    if (updateData.memoryType !== undefined)
      gpu.memoryType = updateData.memoryType;
    if (updateData.lengthMm !== undefined) gpu.lengthMm = updateData.lengthMm;
    try {
      await transactionalEntityManager.save(gpu);
    } catch (err) {
      throw new Error("Không thể lưu thông tin GPU cho sản phẩm");
    }
  }

  private async updateMonitorDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const { Monitor } = await import("../components/monitor.entity");
    let monitor = await Monitor.findOne({
      where: { product: { id: product.id } },
    });
    if (!monitor) {
      monitor = new Monitor();
      monitor.product = product;
    }
    if (updateData.brand !== undefined) monitor.brand = updateData.brand;
    if (updateData.model !== undefined) monitor.model = updateData.model;
    if (updateData.sizeInch !== undefined)
      monitor.sizeInch = updateData.sizeInch;
    if (updateData.resolution !== undefined)
      monitor.resolution = updateData.resolution;
    if (updateData.panelType !== undefined)
      monitor.panelType = updateData.panelType;
    if (updateData.refreshRate !== undefined)
      monitor.refreshRate = updateData.refreshRate;
    try {
      await transactionalEntityManager.save(monitor);
    } catch (err) {
      throw new Error("Không thể lưu thông tin Monitor cho sản phẩm");
    }
  }

  private async updateMotherboardDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const { Motherboard } = await import("../components/motherboard.entity");
    let motherboard = await Motherboard.findOne({
      where: { product: { id: product.id } },
    });
    if (!motherboard) {
      motherboard = new Motherboard();
      motherboard.product = product;
    }
    // Update Motherboard-specific fields
    if (updateData.brand !== undefined) motherboard.brand = updateData.brand;
    if (updateData.model !== undefined) motherboard.model = updateData.model;
    if (updateData.socket !== undefined) motherboard.socket = updateData.socket;
    if (updateData.chipset !== undefined)
      motherboard.chipset = updateData.chipset;
    if (updateData.formFactor !== undefined)
      motherboard.formFactor = updateData.formFactor;
    if (updateData.ramSlots !== undefined)
      motherboard.ramSlots = updateData.ramSlots;
    if (updateData.maxRam !== undefined) motherboard.maxRam = updateData.maxRam;
    try {
      await transactionalEntityManager.save(motherboard);
    } catch (err) {
      throw new Error("Không thể lưu thông tin Motherboard cho sản phẩm");
    }
  }

  private async updatePSUDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const { PSU } = await import("../components/psu.entity");
    let psu = await PSU.findOne({
      where: { product: { id: product.id } },
    });
    if (!psu) {
      psu = new PSU();
      psu.product = product;
    }
    // Update PSU-specific fields
    if (updateData.brand !== undefined) psu.brand = updateData.brand;
    if (updateData.model !== undefined) psu.model = updateData.model;
    if (updateData.wattage !== undefined) psu.wattage = updateData.wattage;
    try {
      await transactionalEntityManager.save(psu);
    } catch (err) {
      throw new Error("Không thể lưu thông tin PSU cho sản phẩm");
    }
  }

  private async updateDriveDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const { Drive } = await import("../components/drive.entity");
    let drive = await Drive.findOne({ where: { product: { id: product.id } } });
    if (!drive) {
      drive = new Drive();
      drive.product = product;
    }
    if (updateData.brand !== undefined) drive.brand = updateData.brand;
    if (updateData.model !== undefined) drive.model = updateData.model;
    if (updateData.type !== undefined) drive.type = updateData.type;
    if (updateData.capacityGb !== undefined)
      drive.capacityGb = updateData.capacityGb;
    if (updateData.interface !== undefined)
      drive.interface = updateData.interface;
    await transactionalEntityManager.save(drive);
  }

  private async updateCoolerDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const { Cooler } = await import("../components/cooler.entity");
    let cooler = await Cooler.findOne({
      where: { product: { id: product.id } },
    });
    if (!cooler) {
      cooler = new Cooler();
      cooler.product = product;
    }
    if (updateData.brand !== undefined) cooler.brand = updateData.brand;
    if (updateData.model !== undefined) cooler.model = updateData.model;
    if (updateData.type !== undefined) cooler.type = updateData.type;
    if (updateData.supportedSockets !== undefined)
      cooler.supportedSockets = updateData.supportedSockets;
    if (updateData.fanSizeMm !== undefined)
      cooler.fanSizeMm = updateData.fanSizeMm;
    await transactionalEntityManager.save(cooler);
  }

  private async updatePCDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const { PC } = await import("../components/pc.entity");
    let pc = await PC.findOne({ where: { product: { id: product.id } } });
    if (!pc) {
      pc = new PC();
      pc.product = product;
    }
    if (updateData.brand !== undefined) pc.brand = updateData.brand;
    if (updateData.model !== undefined) pc.model = updateData.model;
    if (updateData.processor !== undefined) pc.processor = updateData.processor;
    if (updateData.ramGb !== undefined) pc.ramGb = updateData.ramGb;
    if (updateData.storageGb !== undefined) pc.storageGb = updateData.storageGb;
    if (updateData.storageType !== undefined)
      pc.storageType = updateData.storageType;
    if (updateData.graphics !== undefined) pc.graphics = updateData.graphics;
    if (updateData.formFactor !== undefined)
      pc.formFactor = updateData.formFactor;
    if (updateData.powerSupplyWattage !== undefined)
      pc.powerSupplyWattage = updateData.powerSupplyWattage;
    if (updateData.operatingSystem !== undefined)
      pc.operatingSystem = updateData.operatingSystem;
    await transactionalEntityManager.save(pc);
  }

  private async updateNetworkCardDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const { NetworkCard } = await import("../components/networkCard.entity");
    let nc = await NetworkCard.findOne({
      where: { product: { id: product.id } },
    });
    if (!nc) {
      nc = new NetworkCard();
      nc.product = product;
    }
    if (updateData.type !== undefined) nc.type = updateData.type;
    if (updateData.interface !== undefined) nc.interface = updateData.interface;
    if (updateData.speedMbps !== undefined) nc.speedMbps = updateData.speedMbps;
    await transactionalEntityManager.save(nc);
  }

  private async updateCaseDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const { Case } = await import("../components/case.entity");
    let c = await Case.findOne({ where: { product: { id: product.id } } });
    if (!c) {
      c = new Case();
      c.product = product;
    }
    if (updateData.brand !== undefined) c.brand = updateData.brand;
    if (updateData.model !== undefined) c.model = updateData.model;
    if (updateData.formFactorSupport !== undefined)
      c.formFactorSupport = updateData.formFactorSupport;
    if (updateData.hasRgb !== undefined) c.hasRgb = updateData.hasRgb;
    if (updateData.sidePanelType !== undefined)
      c.sidePanelType = updateData.sidePanelType;
    if (updateData.maxGpuLengthMm !== undefined)
      c.maxGpuLengthMm = updateData.maxGpuLengthMm;
    if (updateData.psuType !== undefined) c.psuType = updateData.psuType;
    await transactionalEntityManager.save(c);
  }

  private async updateMouseDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const { Mouse } = await import("../components/mouse.entity");
    let m = await Mouse.findOne({ where: { product: { id: product.id } } });
    if (!m) {
      m = new Mouse();
      m.product = product;
    }
    if (updateData.type !== undefined) m.type = updateData.type;
    if (updateData.dpi !== undefined) m.dpi = updateData.dpi;
    if (updateData.connectivity !== undefined)
      m.connectivity = updateData.connectivity;
    if (updateData.hasRgb !== undefined) m.hasRgb = updateData.hasRgb;
    await transactionalEntityManager.save(m);
  }

  private async updateKeyboardDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const { Keyboard } = await import("../components/keyboard.entity");
    let k = await Keyboard.findOne({ where: { product: { id: product.id } } });
    if (!k) {
      k = new Keyboard();
      k.product = product;
    }
    if (updateData.type !== undefined) k.type = updateData.type;
    if (updateData.switchType !== undefined)
      k.switchType = updateData.switchType;
    if (updateData.connectivity !== undefined)
      k.connectivity = updateData.connectivity;
    if (updateData.layout !== undefined) k.layout = updateData.layout;
    if (updateData.hasRgb !== undefined) k.hasRgb = updateData.hasRgb;
    await transactionalEntityManager.save(k);
  }

  private async updateHeadsetDetails(
    transactionalEntityManager: any,
    product: Product,
    updateData: any
  ): Promise<void> {
    const { Headset } = await import("../components/headset.entity");
    let h = await Headset.findOne({ where: { product: { id: product.id } } });
    if (!h) {
      h = new Headset();
      h.product = product;
    }
    if (updateData.hasMicrophone !== undefined)
      h.hasMicrophone = updateData.hasMicrophone;
    if (updateData.connectivity !== undefined)
      h.connectivity = updateData.connectivity;
    if (updateData.surroundSound !== undefined)
      h.surroundSound = updateData.surroundSound;
    await transactionalEntityManager.save(h);
  }

  async deleteProduct(id: string): Promise<boolean> {
    return DbConnection.appDataSource.manager.transaction(
      async (transactionalEntityManager: EntityManager) => {
        const product = await Product.findOne({
          where: { id },
          relations: ["category"],
        });
        if (!product) {
          throw new EntityNotFoundException("Product");
        }

        if (product.category) {
          const slug = categoryKey(product.category);
          switch (slug) {
            case "cpu": {
              const { CPU } = await import("../components/cpu.entity");
              await transactionalEntityManager.delete(CPU, { product: { id } });
              break;
            }
            case "ram": {
              const { RAM } = await import("../components/ram.entity");
              await transactionalEntityManager.delete(RAM, { product: { id } });
              break;
            }
            case "gpu": {
              const { GPU } = await import("../components/gpu.entity");
              await transactionalEntityManager.delete(GPU, { product: { id } });
              break;
            }
            case "psu": {
              const { PSU } = await import("../components/psu.entity");
              await transactionalEntityManager.delete(PSU, { product: { id } });
              break;
            }
            case "drive": {
              const { Drive } = await import("../components/drive.entity");
              await transactionalEntityManager.delete(Drive, { product: { id } });
              break;
            }
            case "cooler": {
              const { Cooler } = await import("../components/cooler.entity");
              await transactionalEntityManager.delete(Cooler, { product: { id } });
              break;
            }
            case "motherboard": {
              const { Motherboard } = await import("../components/motherboard.entity");
              await transactionalEntityManager.delete(Motherboard, { product: { id } });
              break;
            }
            case "monitor": {
              const { Monitor } = await import("../components/monitor.entity");
              await transactionalEntityManager.delete(Monitor, { product: { id } });
              break;
            }
            case "pc": {
              const { PC } = await import("../components/pc.entity");
              await transactionalEntityManager.delete(PC, { product: { id } });
              break;
            }
            case "laptop": {
              const { Laptop } = await import("../components/laptop/laptop.entity");
              await transactionalEntityManager.delete(Laptop, { product: { id } });
              const { CPULaptop } = await import("../components/laptop/cpu-laptop.entity");
              await transactionalEntityManager.delete(CPULaptop, { product: { id } });
              const { DriveLaptop } = await import("../components/laptop/drive-laptop.entity");
              await transactionalEntityManager.delete(DriveLaptop, { product: { id } });
              const { GPULaptop } = await import("../components/laptop/gpu-laptop.entity");
              await transactionalEntityManager.delete(GPULaptop, { product: { id } });
              const { NetworkCardLaptop } = await import("../components/laptop/networdCard-laptop.entity");
              await transactionalEntityManager.delete(NetworkCardLaptop, { product: { id } });
              const { RAMLaptop } = await import("../components/laptop/ram-laptop.entity");
              await transactionalEntityManager.delete(RAMLaptop, { product: { id } });
              break;
            }
            case "case": {
              const { Case } = await import("../components/case.entity");
              await transactionalEntityManager.delete(Case, { product: { id } });
              break;
            }
            case "mouse": {
              const { Mouse } = await import("../components/mouse.entity");
              await transactionalEntityManager.delete(Mouse, { product: { id } });
              break;
            }
            case "keyboard": {
              const { Keyboard } = await import("../components/keyboard.entity");
              await transactionalEntityManager.delete(Keyboard, { product: { id } });
              break;
            }
            case "network-card": {
              const { NetworkCard } = await import("../components/networkCard.entity");
              await transactionalEntityManager.delete(NetworkCard, { product: { id } });
              break;
            }
            case "headset": {
              const { Headset } = await import("../components/headset.entity");
              await transactionalEntityManager.delete(Headset, { product: { id } });
              break;
            }
            default:
              break;
          }
        }

        // 2. Xoá ảnh
        const { Image } = await import("@/modules/image/image.entity");
        try {
          await transactionalEntityManager.delete(Image, { product: { id } });
        } catch (err) {
          // Error deleting Images: err
        }

        // 3. Xoá feedback
        const { Feedback } = await import("@/modules/feedback/feedback.entity");
        try {
          await transactionalEntityManager.delete(Feedback, { product: { id } });
        } catch (err) {
          // Error deleting Feedback: err
        }

        // 4. Xoá cartItem
        const { CartItem } = await import("@/modules/cart/cartItem.entity");
        try {
          await transactionalEntityManager.delete(CartItem, { product: { id } });
        } catch (err) {
          // Error deleting CartItem: err
        }

        // 5. Xoá orderDetail
        const { OrderDetail } = await import("@/modules/order/orderDetail.entity");
        try {
          await transactionalEntityManager.delete(OrderDetail, { product: { id } });
        } catch (err) {
          // Error deleting OrderDetail: err
        }

        // 6. Xoá chính Product
        try {
          await transactionalEntityManager.delete(Product, { id });
        } catch (err) {
          // Error deleting Product: err
        }

        return true;
      }
    );
  }

  async searchProducts(keyword: string): Promise<Product[]> {
    if (!keyword || keyword.trim() === "") {
      throw new BadRequestException("Search keyword is required");
    }
    const lowerKeyword = `%${keyword.toLowerCase()}%`;

    return await Product.createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "category")
      .leftJoinAndSelect("product.images", "images")
      .where("product.isActive = :isActive", { isActive: true })
      .andWhere("product.stock > :stock", { stock: 0 })
      .andWhere(
        "(LOWER(product.name) LIKE :keyword OR LOWER(product.description) LIKE :keyword OR LOWER(category.name) LIKE :keyword)",
        { keyword: lowerKeyword }
      )
      .orderBy("product.createdAt", "DESC")
      .getMany();
  }

  // Thêm method để lấy sản phẩm theo loại category (main category)
  async getProductsByMainCategory(
    categoryId: string,
    limit: number = 8
  ): Promise<Product[]> {
    await this.getCategoryById(categoryId); // Validate category exists

    return await Product.find({
      where: {
        isActive: true,
        stock: MoreThan(0),
        categoryId: categoryId,
      },
      relations: ["category"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  // Thêm method để lấy tất cả categories
  async getAllCategories(): Promise<Category[]> {
    return await Category.find({
      order: { name: "ASC" },
    });
  }

  // Thêm method để lấy sản phẩm theo nhiều categories
  async getProductsByMultipleCategories(
    categoryIds: string[],
    limit: number = 8
  ): Promise<Product[]> {
    await this.getCategoriesByIds(categoryIds); // Validate categories exist

    return await Product.find({
      where: {
        isActive: true,
        stock: MoreThan(0),
        categoryId: In(categoryIds),
      },
      relations: ["category"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  // Thêm method để lấy sản phẩm theo tên category
  async getProductsByCategoryName(
    categoryName: string,
    limit: number = 8
  ): Promise<Product[]> {
    const category = await this.getCategoryByName(categoryName);

    return await Product.find({
      where: {
        isActive: true,
        stock: MoreThan(0),
        categoryId: category.id,
      },
      relations: ["category"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  // Thêm method để lấy sản phẩm theo loại (laptop, pc, accessories)
  async getProductsByType(
    type: "laptop" | "pc" | "accessories",
    limit: number = 8
  ): Promise<Product[]> {
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

  // Thêm method để lấy sản phẩm theo category ID
  async getProductsByCategoryId(
    categoryId: string,
    limit: number = 8
  ): Promise<Product[]> {
    await this.getCategoryById(categoryId); // Validate category exists

    return await Product.find({
      where: {
        isActive: true,
        stock: MoreThan(0),
        categoryId: categoryId,
      },
      relations: ["category"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  // Thêm method để lấy tất cả sản phẩm (bao gồm cả hết hàng) - cho admin
  async getAllProductsIncludingOutOfStock(): Promise<Product[]> {
    return await Product.find({
      relations: ["category", "images"],
      order: { createdAt: "DESC" },
    });
  }

  // Thêm method để lấy sản phẩm hết hàng
  async getOutOfStockProducts(): Promise<Product[]> {
    return await Product.find({
      where: {
        isActive: true,
        stock: 0,
      },
      relations: ["category"],
      order: { createdAt: "DESC" },
    });
  }

  // async addProducts() {
  //   const products = await addSampleProductsFromLaptopMd();
  //   return products;
  // }
}

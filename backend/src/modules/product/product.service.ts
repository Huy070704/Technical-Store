import { DbConnection } from "@/database/dbConnection";
import { HttpException } from "@/shared/exceptions/http-exceptions";
import { Image } from "@/modules/image/image.entity";
import { Service } from "typedi";
import { ILike, Repository } from "typeorm";
import { Category } from "./category.entity";
import { SaveProductDto } from "./product.dto";
import { Product } from "./product.entity";

@Service()
export class ProductService {
  private get productRepository(): Repository<Product> {
    return DbConnection.appDataSource.getRepository(Product);
  }

  private get categoryRepository(): Repository<Category> {
    return DbConnection.appDataSource.getRepository(Category);
  }

  private get imageRepository(): Repository<Image> {
    return DbConnection.appDataSource.getRepository(Image);
  }

  async getAllProducts(): Promise<{ products: Product[] }> {
    const products = await this.productRepository.find({
      relations: { category: true, images: true },
      order: { createdAt: "DESC" },
    });

    return { products };
  }

  async getProductById(id: string): Promise<{ product: Product }> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { category: true, images: true },
    });

    if (!product) {
      throw new HttpException(404, "Product not found");
    }

    return { product };
  }

  async createProduct(body: SaveProductDto): Promise<{ product: Product }> {
    const product = this.productRepository.create({
      name: body.name.trim(),
      price: body.price,
      stock: body.stock,
      description: body.description?.trim() || "",
      isActive: body.isActive ?? true,
    });

    if (body.categoryId) {
      product.category = await this.findCategory(body.categoryId);
      product.categoryId = product.category.id;
    }

    const savedProduct = await this.productRepository.save(product);
    await this.replaceProductImage(savedProduct, body.imageUrl);

    return this.getProductById(savedProduct.id);
  }

  async updateProduct(id: string, body: SaveProductDto): Promise<{ product: Product }> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { images: true },
    });

    if (!product) {
      throw new HttpException(404, "Product not found");
    }

    product.name = body.name.trim();
    product.price = body.price;
    product.stock = body.stock;
    product.description = body.description?.trim() || "";
    product.isActive = body.isActive ?? product.isActive;

    if (body.categoryId) {
      product.category = await this.findCategory(body.categoryId);
      product.categoryId = product.category.id;
    } else {
      product.category = null as unknown as Category;
      product.categoryId = null as unknown as string;
    }

    const savedProduct = await this.productRepository.save(product);
    await this.replaceProductImage(savedProduct, body.imageUrl);

    return this.getProductById(savedProduct.id);
  }

  async deleteProduct(id: string): Promise<{ id: string }> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new HttpException(404, "Product not found");
    }

    await this.productRepository.softDelete(id);
    return { id };
  }

  async getCategories(): Promise<{ categories: Category[] }> {
    const categories = await this.categoryRepository.find({
      order: { name: "ASC" },
    });

    return { categories };
  }

  async searchProducts(keyword: string): Promise<{ products: Product[] }> {
    const q = keyword.trim();
    if (!q) return this.getAllProducts();

    const products = await this.productRepository.find({
      where: [
        { name: ILike(`%${q}%`) },
        { description: ILike(`%${q}%`) },
      ],
      relations: { category: true, images: true },
      order: { createdAt: "DESC" },
    });

    return { products };
  }

  async getNewProducts(limit = 8): Promise<{
    products: { laptops: Product[]; pcs: Product[]; accessories: Product[] };
  }> {
    const products = await this.productRepository.find({
      where: { isActive: true },
      relations: { category: true, images: true },
      order: { createdAt: "DESC" },
      take: Math.max(limit * 3, limit),
    });

    const byCategory = (keywords: string[]) =>
      products
        .filter((product) => {
          const category = product.category?.name?.toLowerCase() ?? "";
          return keywords.some((keyword) => category.includes(keyword));
        })
        .slice(0, limit);

    return {
      products: {
        laptops: byCategory(["laptop"]),
        pcs: byCategory(["pc", "desktop"]),
        accessories: byCategory([
          "accessory",
          "accessories",
          "component",
          "keyboard",
          "mouse",
          "monitor",
          "headset",
        ]),
      },
    };
  }

  async getTopSellingProducts(limit = 8): Promise<{ products: Product[] }> {
    const products = await this.productRepository
      .createQueryBuilder("product")
      .leftJoinAndSelect("product.category", "category")
      .leftJoinAndSelect("product.images", "images")
      .leftJoin("product.orderDetails", "orderDetail")
      .where("product.isActive = :isActive", { isActive: true })
      .groupBy("product.id")
      .addGroupBy("category.id")
      .addGroupBy("images.id")
      .orderBy("COUNT(orderDetail.id)", "DESC")
      .addOrderBy("product.createdAt", "DESC")
      .take(limit)
      .getMany();

    return { products };
  }

  private async findCategory(categoryId: string): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      throw new HttpException(404, "Category not found");
    }

    return category;
  }

  private async replaceProductImage(product: Product, imageUrl?: string): Promise<void> {
    await this.imageRepository
      .createQueryBuilder()
      .delete()
      .where('"productId" = :productId', { productId: product.id })
      .execute();

    const url = imageUrl?.trim();
    if (!url) return;

    const imageName = url.split("/").pop() || product.name || "product-image";
    const image = this.imageRepository.create({
      name: imageName,
      originalName: imageName,
      url,
      product,
    });

    await this.imageRepository.save(image);
  }
}

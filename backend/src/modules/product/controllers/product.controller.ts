import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  QueryParam,
  Req,
  UseBefore,
} from "routing-controllers";
import { Account } from "@/modules/auth/models/account.model";
import { BadRequestException } from "@/shared/exceptions/http-exceptions";
import { Service } from "typedi";
import { ProductService } from "../services/product.service";
import { parseBody } from "@/shared/validators/parse-body";
import { z } from "zod";

const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ");

const createProductSchema = z.object({
  name: z.string().min(1, "Tên sản phẩm không được trống").max(255),
  price: z.number().positive("Giá phải lớn hơn 0"),
  description: z.string().optional(),
  categoryId: mongoId,
  isActive: z.boolean().optional(),
  url: z.string().url().optional(),
}).passthrough();

const updateProductSchema = createProductSchema.partial();
import { Auth } from "@/middlewares/auth.middleware";
import { CheckAbility } from "@/middlewares/rbac/permission.decorator";
import { Product } from "../models/product.model";

@Service()
@Controller("/products")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get("/")
  async getAllProducts() {
    const products = await this.productService.getAllProducts();
    return { message: "Products retrieved successfully", products };
  }

  @Get("/instore")
  @UseBefore(Auth)
  async getInstoreProducts(@Req() req: any) {
    const accountId = req.user?.accountId;
    const staff = await Account.findById(accountId);
    if (!staff?.facility) {
      throw new BadRequestException("Nhân viên chưa được phân công cơ sở");
    }
    const products = await this.productService.getProductsByFacility(
      staff.facility.toString()
    );
    return { message: "Products retrieved successfully", products };
  }

  @Get("/all-including-out-of-stock")
  @UseBefore(Auth)
  @CheckAbility("read", Product)
  async getAllProductsIncludingOutOfStock(@Req() _req: any) {
    const products = await this.productService.getAllProductsIncludingOutOfStock();
    return {
      message: "All products (including out of stock) retrieved successfully",
      products,
    };
  }

  @Get("/admin/all")
  @UseBefore(Auth)
  @CheckAbility("read", Product)
  async getAllProductsForAdmin(@Req() _req: any) {
    const products = await this.productService.getAllProductsIncludingOutOfStock();
    return { message: "All products for admin retrieved successfully", products };
  }

  @Get("/out-of-stock")
  @UseBefore(Auth)
  @CheckAbility("read", Product)
  async getOutOfStockProducts(@Req() _req: any) {
    const products = await this.productService.getOutOfStockProducts();
    return { message: "Out of stock products retrieved successfully", products };
  }

  @Get("/new")
  async getNewProducts(@QueryParam("limit") limit: number = 8) {
    const products = await this.productService.getNewProducts(limit);
    return { message: "New products retrieved successfully", products };
  }

  @Get("/top-selling")
  async getTopSellingProducts(@QueryParam("limit") limit: number = 6) {
    const products = await this.productService.getTopSellingProducts(limit);
    return {
      message: "Featured products retrieved successfully (by availability)",
      products,
    };
  }

  @Get("/search")
  async searchProducts(@QueryParam("q") keyword: string) {
    if (!keyword || keyword.trim() === "") {
      return { message: "Missing search keyword" };
    }
    const products = await this.productService.searchProducts(keyword);
    return { message: "Products search result", products };
  }

  @Get("/categories/all")
  async getAllCategories() {
    const categories = await this.productService.getAllCategories();
    return { message: "Categories retrieved successfully", categories };
  }

  @Get("/categories/multiple")
  async getProductsByMultipleCategories(
    @QueryParam("categoryIds") categoryIds: string,
    @QueryParam("limit") limit: number = 8
  ) {
    if (!categoryIds) {
      return { message: "Missing category IDs" };
    }
    const categoryIdArray = categoryIds.split(",").map((id) => id.trim());
    const products = await this.productService.getProductsByMultipleCategories(
      categoryIdArray,
      limit
    );
    return {
      message: "Products by multiple categories retrieved successfully",
      products,
    };
  }

  @Get("/category/:categoryId")
  async getProductsByCategory(@Param("categoryId") categoryId: string) {
    const products = await this.productService.getProductsByCategory(categoryId);
    return { message: "Products by category retrieved successfully", products };
  }

  @Get("/category-name/:categoryName")
  async getProductsByCategoryName(@Param("categoryName") categoryName: string) {
    const products = await this.productService.getProductsByCategoryName(categoryName);
    return { message: "Products by category name retrieved successfully", products };
  }

  @Get("/main-category/:categoryId")
  async getProductsByMainCategory(
    @Param("categoryId") categoryId: string,
    @QueryParam("limit") limit: number = 8
  ) {
    const products = await this.productService.getProductsByMainCategory(categoryId, limit);
    return { message: "Products by main category retrieved successfully", products };
  }

  @Get("/type/:type")
  async getProductsByType(
    @Param("type") type: string,
    @QueryParam("limit") limit: number = 8
  ) {
    if (!["laptop", "pc", "accessories"].includes(type)) {
      return { message: "Invalid product type. Must be laptop, pc, or accessories" };
    }
    const products = await this.productService.getProductsByType(
      type as "laptop" | "pc" | "accessories",
      limit
    );
    return { message: `Products by type '${type}' retrieved successfully`, products };
  }

  @Get("/name/:name")
  async getProductByName(@Param("name") name: string) {
    const product = await this.productService.getProductByName(name);
    if (!product) {
      return { message: "Product not found" };
    }
    return { message: "Product retrieved successfully", product };
  }

  @Get("/:id/admin")
  @UseBefore(Auth)
  @CheckAbility("read", Product)
  async getProductByIdForAdmin(@Req() _req: any, @Param("id") id: string) {
    const product = await this.productService.getProductByIdForAdmin(id);
    return { message: "Product retrieved successfully", product };
  }

  @Get("/:id")
  async getProductById(@Param("id") id: string) {
    const product = await this.productService.getProductById(id);
    return { message: "Product retrieved successfully", product };
  }

  @UseBefore(Auth)
  @CheckAbility("create", Product)
  @Post("/")
  async createProduct(@Req() _req: any, @Body({ validate: false }) body: unknown) {
    const dto = parseBody(createProductSchema, body);
    const product = await this.productService.createProduct(dto);
    return { message: "Product created successfully", product };
  }

  @UseBefore(Auth)
  @CheckAbility("update", Product)
  @Put("/:id")
  async updateProductPut(@Req() _req: any, @Param("id") id: string, @Body({ validate: false }) body: unknown) {
    const dto = parseBody(updateProductSchema, body);
    const product = await this.productService.updateProduct(id, dto);
    return { message: "Product updated successfully", product };
  }

  @UseBefore(Auth)
  @CheckAbility("update", Product)
  @Patch("/:id")
  async updateProductPatch(@Req() _req: any, @Param("id") id: string, @Body({ validate: false }) body: unknown) {
    const dto = parseBody(updateProductSchema, body);
    const product = await this.productService.updateProduct(id, dto);
    return { message: "Product updated successfully", product };
  }

  @UseBefore(Auth)
  @CheckAbility("delete", Product)
  @Delete("/:id")
  async deleteProduct(@Req() _req: any, @Param("id") id: string) {
    await this.productService.deleteProduct(id);
    return { message: "Product deleted successfully" };
  }
}

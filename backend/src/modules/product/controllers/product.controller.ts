import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  QueryParam,
  Req,
  UseBefore,
} from "routing-controllers";
import { Service } from "typedi";
import { ProductService } from "../services/product.service";
import { CreateProductDto, UpdateProductDto } from "../dtos/product.dto";
import { Auth } from "@/middlewares/auth.middleware";
import { CheckAbility } from "@/middlewares/rbac/permission.decorator";
import { Product } from "../product.entity";

@Service()
@Controller("/products")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get("/")
  async getAllProducts() {
    const products = await this.productService.getAllProducts();
    return { message: "Products retrieved successfully", products };
  }

  @Get("/all-including-out-of-stock")
  @UseBefore(Auth)
  @CheckAbility("read", Product)
  async getAllProductsIncludingOutOfStock() {
    const products = await this.productService.getAllProductsIncludingOutOfStock();
    return {
      message: "All products (including out of stock) retrieved successfully",
      products,
    };
  }

  @Get("/admin/all")
  @UseBefore(Auth)
  @CheckAbility("read", Product)
  async getAllProductsForAdmin() {
    const products = await this.productService.getAllProductsIncludingOutOfStock();
    return { message: "All products for admin retrieved successfully", products };
  }

  @Get("/out-of-stock")
  @UseBefore(Auth)
  @CheckAbility("read", Product)
  async getOutOfStockProducts() {
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
  async getProductByIdForAdmin(@Param("id") id: string) {
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
  async createProduct(@Body() createProductDto: CreateProductDto) {
    const product = await this.productService.createProduct(createProductDto);
    return { message: "Product created successfully", product };
  }

  @UseBefore(Auth)
  @CheckAbility("update", Product)
  @Put("/:id")
  async updateProduct(@Param("id") id: string, @Body() updateProductDto: UpdateProductDto) {
    const product = await this.productService.updateProduct(id, updateProductDto);
    return { message: "Product updated successfully", product };
  }

  @UseBefore(Auth)
  @CheckAbility("delete", Product)
  @Delete("/:id")
  async deleteProduct(@Param("id") id: string) {
    await this.productService.deleteProduct(id);
    return { message: "Product deleted successfully" };
  }
}

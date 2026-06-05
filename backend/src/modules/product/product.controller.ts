import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  QueryParam,
  UseBefore,
} from "routing-controllers";
import { Admin } from "@/middlewares/auth.middleware";
import { Service } from "typedi";
import { SaveProductDto } from "./product.dto";
import { ProductService } from "./product.service";

@Service()
@Controller("/products")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get("/")
  async getAllProducts() {
    return this.productService.getAllProducts();
  }

  @Get("/categories/all")
  async getCategories() {
    return this.productService.getCategories();
  }

  @Get("/search")
  async searchProducts(@QueryParam("q") q = "") {
    return this.productService.searchProducts(q);
  }

  @Get("/new")
  async getNewProducts(@QueryParam("limit") limit = 8) {
    return this.productService.getNewProducts(Number(limit) || 8);
  }

  @Get("/top-selling")
  async getTopSellingProducts(@QueryParam("limit") limit = 8) {
    return this.productService.getTopSellingProducts(Number(limit) || 8);
  }

  @Get("/:id")
  async getProductById(@Param("id") id: string) {
    return this.productService.getProductById(id);
  }

  @Post("/")
  @UseBefore(Admin)
  async createProduct(@Body() body: SaveProductDto) {
    return this.productService.createProduct(body);
  }

  @Patch("/:id")
  @UseBefore(Admin)
  async updateProduct(@Param("id") id: string, @Body() body: SaveProductDto) {
    return this.productService.updateProduct(id, body);
  }

  @Delete("/:id")
  @UseBefore(Admin)
  async deleteProduct(@Param("id") id: string) {
    return this.productService.deleteProduct(id);
  }
}

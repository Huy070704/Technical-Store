import { Controller, Get, Req, Res, UseBefore, QueryParam } from "routing-controllers";
import { Service } from "typedi";
import { Admin, Auth } from "@/middlewares/auth.middleware";
import { InventoryService } from "../services/inventory.service";
import { Response } from "express";

@Service()
@Controller("/inventory")
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get("/report")
  @UseBefore(Admin)
  async getReport(
    @QueryParam("facilityId") facilityId?: string,
    @QueryParam("categoryId") categoryId?: string,
    @QueryParam("status") status?: string,
    @QueryParam("search") search?: string,
    @QueryParam("page") page?: number,
    @QueryParam("limit") limit?: number,
    @QueryParam("sortBy") sortBy?: string,
    @QueryParam("sortOrder") sortOrder?: "asc" | "desc"
  ) {
    return await this.inventoryService.getInventoryReport({
      facilityId,
      categoryId,
      status,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    });
  }

  @Get("/export")
  @UseBefore(Auth)
  async exportReport(
    @Res() res: Response,
    @QueryParam("facilityId") facilityId?: string,
    @QueryParam("categoryId") categoryId?: string,
    @QueryParam("status") status?: string,
    @QueryParam("search") search?: string,
    @QueryParam("sortBy") sortBy?: string,
    @QueryParam("sortOrder") sortOrder?: "asc" | "desc"
  ) {
    return await this.inventoryService.exportInventoryReport(
      {
        facilityId,
        categoryId,
        status,
        search,
        sortBy,
        sortOrder,
      },
      res
    );
  }
}

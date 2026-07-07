import {
  Controller,
  Get,
  Req,
  Res,
  UseBefore,
  QueryParam,
  Patch,
  Body,
} from "routing-controllers";
import { Service } from "typedi";
import { z } from "zod";
import { Admin, Auth, Manager } from "@/middlewares/auth.middleware";
import { InventoryService } from "../services/inventory.service";
import { Response, Request } from "express";
import { parseBody } from "@/shared/validators/parse-body";
import { AccountDetailsDto } from "@/modules/auth/account.types";

interface RequestWithUser extends Request {
  user?: AccountDetailsDto;
}

const adjustStockSchema = z.object({
  productId: z.string().trim().min(1, "Thiếu mã sản phẩm"),
  facilityId: z.string().trim().min(1, "Thiếu mã cơ sở"),
  mode: z.enum(["set", "add", "subtract"]),
  quantity: z.number().min(0, "Số lượng không hợp lệ"),
  reason: z.string().trim().max(500).optional(),
});

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

  @Get("/manager/report")
  @UseBefore(Manager)
  async getManagerReport(
    @Req() req: RequestWithUser,
    @QueryParam("facilityId") facilityId?: string,
    @QueryParam("categoryId") categoryId?: string,
    @QueryParam("status") status?: string,
    @QueryParam("search") search?: string,
    @QueryParam("page") page?: number,
    @QueryParam("limit") limit?: number,
    @QueryParam("sortBy") sortBy?: string,
    @QueryParam("sortOrder") sortOrder?: "asc" | "desc"
  ) {
    return await this.inventoryService.getManagerInventoryReport(req.user!.accountId!, {
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

  @Get("/staff/report")
  @UseBefore(Auth)
  async getStaffReport(
    @Req() req: RequestWithUser,
    @QueryParam("categoryId") categoryId?: string,
    @QueryParam("status") status?: string,
    @QueryParam("search") search?: string,
    @QueryParam("page") page?: number,
    @QueryParam("limit") limit?: number,
    @QueryParam("sortBy") sortBy?: string,
    @QueryParam("sortOrder") sortOrder?: "asc" | "desc"
  ) {
    return await this.inventoryService.getStaffInventoryReport(req.user!.accountId!, {
      categoryId,
      status,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
    });
  }

  @Patch("/adjust")
  @UseBefore(Manager)
  async adjustStock(@Req() req: RequestWithUser, @Body({ validate: false }) body: unknown) {
    const dto = parseBody(adjustStockSchema, body);
    const result = await this.inventoryService.adjustStock(req.user!.accountId!, dto);
    return { message: "Điều chỉnh tồn kho thành công", ...result };
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

  @Get("/manager/export")
  @UseBefore(Manager)
  async exportManagerReport(
    @Req() req: RequestWithUser,
    @Res() res: Response,
    @QueryParam("facilityId") facilityId?: string,
    @QueryParam("categoryId") categoryId?: string,
    @QueryParam("status") status?: string,
    @QueryParam("search") search?: string,
    @QueryParam("sortBy") sortBy?: string,
    @QueryParam("sortOrder") sortOrder?: "asc" | "desc"
  ) {
    return await this.inventoryService.exportManagerInventoryReport(req.user!.accountId!, {
      facilityId,
      categoryId,
      status,
      search,
      sortBy,
      sortOrder,
    }, res);
  }
}

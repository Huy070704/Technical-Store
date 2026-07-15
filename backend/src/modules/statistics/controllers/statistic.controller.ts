import { Controller, Get, QueryParam, Req, Res, UseBefore } from "routing-controllers";
import { Service } from "typedi";
import { Auth } from "@/middlewares/auth.middleware";
import { CheckAbility } from "@/middlewares/rbac/permission.decorator";
import { StatisticService } from "../services/statistic.service";
import { Invoice } from "../../payment/models/invoice.model";
import { Response } from "express";

@Service()
@Controller("/statistics")
export class StatisticController {
  constructor(private readonly statisticService: StatisticService) {}

  @Get("/dashboard")
  @UseBefore(Auth)
  @CheckAbility("read", Invoice)
  async getDashboardData(
    @Req() req: any,
    @QueryParam("timeRange") timeRange?: string,
    @QueryParam("startDate") startDate?: string,
    @QueryParam("endDate") endDate?: string
  ) {
    const user = req.user as { facilityId?: string | null };
    return await this.statisticService.getDashboardStatistics(user.facilityId ?? null, {
      timeRange,
      startDate,
      endDate,
    });
  }

  @Get("/admin-dashboard")
  @UseBefore(Auth)
  @CheckAbility("read", Invoice)
  async getAdminDashboardData(
    @Req() req: any,
    @QueryParam("timeRange") timeRange?: string,
    @QueryParam("startDate") startDate?: string,
    @QueryParam("endDate") endDate?: string
  ) {
    return await this.statisticService.getAdminDashboardData({
      timeRange,
      startDate,
      endDate,
    });
  }

  @Get("/export")
  @UseBefore(Auth)
  @CheckAbility("read", Invoice)
  async exportReport(
    @Req() req: any,
    @Res() res: Response,
    @QueryParam("timeRange") timeRange?: string,
    @QueryParam("startDate") startDate?: string,
    @QueryParam("endDate") endDate?: string
  ) {
    const user = req.user as { facilityId?: string | null };
    return await this.statisticService.exportSalesReport(
      user.facilityId ?? null,
      { timeRange, startDate, endDate },
      res
    );
  }

  @Get("/manager-export")
  @UseBefore(Auth)
  @CheckAbility("read", Invoice)
  async exportManagerStats(
    @Req() req: any,
    @Res() res: Response,
    @QueryParam("type") type?: "revenue" | "orders" | "products" | "customers",
    @QueryParam("timeRange") timeRange?: string,
    @QueryParam("startDate") startDate?: string,
    @QueryParam("endDate") endDate?: string
  ) {
    const user = req.user as { facilityId?: string | null };
    return await this.statisticService.exportManagerStats(
      user.facilityId ?? null,
      type ?? "revenue",
      { timeRange, startDate, endDate },
      res
    );
  }

  @Get("/revenue")
  @UseBefore(Auth)
  @CheckAbility("read", Invoice)
  async getRevenueData(
    @Req() req: any,
    @QueryParam("channel") channel?: string,
    @QueryParam("timeRange") timeRange?: string,
    @QueryParam("startDate") startDate?: string,
    @QueryParam("endDate") endDate?: string,
  ) {
    return await this.statisticService.getRevenueStatistics({
      channel: channel as any,
      timeRange: timeRange as any,
      startDate,
      endDate,
    });
  }
  @Get("/manager-stats")
  @UseBefore(Auth)
  @CheckAbility("read", Invoice)
  async getManagerStats(
    @Req() req: any,
    @QueryParam("timeRange") timeRange?: string,
    @QueryParam("startDate") startDate?: string,
    @QueryParam("endDate") endDate?: string
  ) {
    const user = req.user as { facilityId?: string | null };
    return await this.statisticService.getManagerDetailedStats(user.facilityId ?? null, {
      timeRange,
      startDate,
      endDate,
    });
  }
}

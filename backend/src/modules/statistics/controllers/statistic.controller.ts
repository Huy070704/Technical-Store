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
  async getDashboardData(@Req() req: any) {
    return await this.statisticService.getDashboardStatistics();
  }

  @Get("/export")
  @UseBefore(Auth)
  @CheckAbility("read", Invoice)
  async exportReport(@Req() req: any, @Res() res: Response) {
    return await this.statisticService.exportSalesReport(res);
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
}

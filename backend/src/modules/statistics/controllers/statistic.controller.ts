import { Controller, Get, Req, Res, UseBefore } from "routing-controllers";
import { Service } from "typedi";
import { Auth } from "@/middlewares/auth.middleware";
import { CheckAbility } from "@/middlewares/rbac/permission.decorator";
import { StatisticService } from "../services/statistic.service";
import { Invoice } from "../../payment/invoice.model";
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
}

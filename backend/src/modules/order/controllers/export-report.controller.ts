import {
  Controller,
  Get,
  QueryParam,
  UseBefore,
  Res,
} from "routing-controllers";
import { Service } from "typedi";
import { ExportReportService } from "../services/export-report.service";
import { Admin } from "@/middlewares/auth.middleware";
import { Response } from "express";

@Service()
@Controller("/reports")
export class ExportReportController {
  constructor(private readonly exportReportService: ExportReportService) {}

  @Get("/export/excel")
  @UseBefore(Admin)
  async exportReport(
    @Res() res: Response,
    @QueryParam("timeRange") timeRange?: string,
    @QueryParam("channel") channel?: string,
    @QueryParam("search") search?: string,
    @QueryParam("startDate") startDate?: string,
    @QueryParam("endDate") endDate?: string
  ) {
    return await this.exportReportService.exportReport(
      {
        timeRange: (timeRange as "all" | "today" | "week" | "month" | "custom") ?? "all",
        channel: (channel as "all" | "online" | "pos") ?? "all",
        search: search ?? "",
        startDate: startDate ?? undefined,
        endDate: endDate ?? undefined,
      },
      res
    );
  }

  @Get("/export")
  @UseBefore(Admin)
  async getExportReport(
    @QueryParam("timeRange") timeRange?: string,
    @QueryParam("channel") channel?: string,
    @QueryParam("search") search?: string,
    @QueryParam("page") page?: number,
    @QueryParam("limit") limit?: number,
    @QueryParam("startDate") startDate?: string,
    @QueryParam("endDate") endDate?: string
  ) {
    const result = await this.exportReportService.getExportReport({
      timeRange: (timeRange as "all" | "today" | "week" | "month" | "custom") ?? "all",
      channel: (channel as "all" | "online" | "pos") ?? "all",
      search: search ?? "",
      page: page ?? 1,
      limit: limit ?? 10,
      startDate: startDate ?? undefined,
      endDate: endDate ?? undefined,
    });

    return {
      message: "Lấy báo cáo xuất kho thành công",
      ...result,
    };
  }
}

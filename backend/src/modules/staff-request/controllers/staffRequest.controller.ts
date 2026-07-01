import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  QueryParam,
  Req,
  UseBefore,
} from "routing-controllers";
import { Service } from "typedi";
import { z } from "zod";
import { Request } from "express";
import { Admin, Manager } from "@/middlewares/auth.middleware";
import { AccountDetailsDto } from "@/modules/auth/account.types";
import { parseBody } from "@/shared/validators/parse-body";
import { StaffRequestService } from "../services/staffRequest.service";

interface RequestWithUser extends Request {
  user?: AccountDetailsDto;
}

const createRequestSchema = z.object({
  roleNeeded: z.enum(["staff", "manager", "shipper"]),
  quantity: z.number().int().min(1).max(50),
  reason: z.string().trim().min(10, "Lý do phải có ít nhất 10 ký tự").max(500),
});

const reviewRequestSchema = z.object({
  adminNote: z.string().trim().max(500).optional(),
});

@Service()
@Controller("/staff-requests")
export class StaffRequestController {
  constructor(private readonly staffRequestService: StaffRequestService) {}

  @Post()
  @UseBefore(Manager)
  async create(@Req() req: RequestWithUser, @Body({ validate: false }) body: unknown) {
    const dto = parseBody(createRequestSchema, body);
    const request = await this.staffRequestService.createRequest(req.user!.accountId!, dto);
    return { message: "Đã gửi yêu cầu bổ sung nhân sự", request };
  }

  @Get("/my")
  @UseBefore(Manager)
  async getMyRequests(
    @Req() req: RequestWithUser,
    @QueryParam("page") page?: number,
    @QueryParam("pageSize") pageSize?: number
  ) {
    const result = await this.staffRequestService.getMyRequests(
      req.user!.accountId!,
      page,
      pageSize
    );
    return { message: "Staff requests retrieved", ...result };
  }

  @Get("/management")
  @UseBefore(Admin)
  async getManagement(
    @QueryParam("status") status?: "all" | "pending" | "approved" | "rejected",
    @QueryParam("page") page?: number,
    @QueryParam("pageSize") pageSize?: number
  ) {
    const result = await this.staffRequestService.getManagementRequests({
      status: status ?? "all",
      page,
      pageSize,
    });
    return { message: "Staff requests retrieved", ...result };
  }

  @Patch("/:id/approve")
  @UseBefore(Admin)
  async approve(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
    @Body({ validate: false }) body: unknown
  ) {
    const dto = parseBody(reviewRequestSchema, body ?? {});
    const request = await this.staffRequestService.reviewRequest(
      id,
      req.user!.accountId!,
      "approved",
      dto.adminNote
    );
    return { message: "Đã duyệt yêu cầu nhân sự", request };
  }

  @Patch("/:id/reject")
  @UseBefore(Admin)
  async reject(
    @Param("id") id: string,
    @Req() req: RequestWithUser,
    @Body({ validate: false }) body: unknown
  ) {
    const dto = parseBody(reviewRequestSchema, body ?? {});
    const request = await this.staffRequestService.reviewRequest(
      id,
      req.user!.accountId!,
      "rejected",
      dto.adminNote
    );
    return { message: "Đã từ chối yêu cầu nhân sự", request };
  }
}

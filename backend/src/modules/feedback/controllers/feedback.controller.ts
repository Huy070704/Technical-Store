import { Service } from "typedi";
import {
  Controller,
  Get,
  Param,
  Delete,
  OnUndefined,
  QueryParam,
  Res,
  Patch,
  Body,
  UseBefore,
  Req,
  Post,
} from "routing-controllers";
import { z } from "zod";
import { FeedbackService } from "../services/feedback.service";
import ExcelJS from "exceljs";
import { Response, Request } from "express";
import { Auth, Manager } from "@/middlewares/auth.middleware";
import { parseBody } from "@/shared/validators/parse-body";
import { AccountDetailsDto } from "@/modules/auth/account.types";

interface RequestWithUser extends Request {
  user?: AccountDetailsDto;
}

const replySchema = z.object({
  managerContent: z.string().trim().min(1, "Nội dung phản hồi không được để trống").max(500),
});

const hideSchema = z.object({
  isHidden: z.boolean(),
});

const createFeedbackSchema = z.object({
  orderId: z.string().trim().min(1, "Thiếu mã đơn hàng"),
  productId: z.string().trim().min(1, "Thiếu mã sản phẩm"),
  rating: z.number().int().min(1, "Số sao tối thiểu là 1").max(5, "Số sao tối đa là 5"),
  customerContent: z
    .string()
    .trim()
    .min(1, "Nội dung đánh giá không được để trống")
    .max(500),
});

const contactSchema = z.object({
  user_name: z.string().trim().min(1, "Họ và tên không được để trống"),
  user_email: z.string().trim().email("Email không hợp lệ"),
  phone_number: z.string().trim().optional(),
  service: z.string().trim().optional(),
  message: z.string().trim().min(1, "Nội dung yêu cầu không được để trống"),
});

@Service()
@Controller("/feedbacks")
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post("/contact")
  async submitContact(@Body({ validate: false }) body: unknown) {
    const dto = parseBody(contactSchema, body);
    await this.feedbackService.sendContactEmail(dto);
    return { message: "Gửi yêu cầu tư vấn thành công" };
  }

  @Post("/")
  @UseBefore(Auth)
  async create(@Body({ validate: false }) body: unknown, @Req() req: RequestWithUser) {
    const dto = parseBody(createFeedbackSchema, body);
    const feedback = await this.feedbackService.createFeedback(req.user!.accountId!, dto);
    return { message: "Đánh giá thành công", feedback };
  }

  @Get("/management")
  @UseBefore(Manager)
  async getManagement(
    @QueryParam("page") page: number = 1,
    @QueryParam("pageSize") pageSize: number = 10,
    @QueryParam("keyword") keyword?: string,
    @QueryParam("rating") rating?: number,
    @QueryParam("productId") productId?: string,
    @QueryParam("status") status?: "all" | "visible" | "hidden" | "replied" | "unreplied",
    @QueryParam("fromDate") fromDate?: string,
    @QueryParam("toDate") toDate?: string
  ) {
    const result = await this.feedbackService.getFeedbacksForManagement({
      page,
      pageSize,
      keyword,
      rating,
      productId,
      status: status ?? "all",
      fromDate,
      toDate,
    });
    return { message: "Feedbacks retrieved", ...result };
  }

  @Get("/statistics")
  @UseBefore(Manager)
  async getStatistics() {
    const statistics = await this.feedbackService.getStatistics();
    return { message: "Feedback statistics", statistics };
  }

  @Get("/my-feedbacks")
  @UseBefore(Auth)
  async getMyFeedbacks(@Req() req: RequestWithUser) {
    const feedbacks = await this.feedbackService.getFeedbacksByCustomer(req.user!.accountId!);
    return { message: "My feedbacks retrieved", feedbacks };
  }

  @Get()
  async getAll() {
    const feedbacks = await this.feedbackService.getAllFeedbacks();
    return { message: "Feedbacks retrieved", feedbacks };
  }

  @Get("/paginated")
  async getPaginated(
    @QueryParam("page") page: number = 1,
    @QueryParam("pageSize") pageSize: number = 10
  ) {
    return await this.feedbackService.getFeedbacksPaginated(page, pageSize);
  }

  @Get("/product/:productId")
  async getFeedbacksByProduct(@Param("productId") productId: string) {
    const feedbacks = await this.feedbackService.getFeedbacksByProduct(productId);
    return { message: "Feedbacks by product", feedbacks };
  }

  @Get("/export")
  @UseBefore(Manager)
  async exportFeedbacks(@Res() res: Response) {
    const feedbacks = await this.feedbackService.getAllFeedbacks();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Feedbacks");
    worksheet.columns = [
      { header: "Product Name", key: "productName", width: 30 },
      { header: "Account Name", key: "accountName", width: 25 },
      { header: "Rating", key: "rating", width: 10 },
      { header: "Content", key: "content", width: 50 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];
    feedbacks.forEach((fb) => {
      worksheet.addRow({
        productName: (fb as any).product?.name || "",
        accountName:
          (fb as any).customer?.name ||
          (fb as any).customer?.username ||
          (fb as any).customer?.email ||
          "",
        rating: fb.rating,
        content: fb.customerContent,
        createdAt: fb.createdAt ? new Date(fb.createdAt).toLocaleString() : "",
      });
    });
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", "attachment; filename=feedbacks.xlsx");
    await workbook.xlsx.write(res);
    res.end();
    return res;
  }

  @Get("/:id")
  async getOne(@Param("id") id: string) {
    const feedback = await this.feedbackService.getFeedbackById(id);
    return { message: "Feedback", feedback };
  }

  @Patch("/:id/reply")
  @UseBefore(Manager)
  async reply(@Param("id") id: string, @Body({ validate: false }) body: unknown, @Req() req: RequestWithUser) {
    const dto = parseBody(replySchema, body);
    const feedback = await this.feedbackService.replyToFeedback(
      id,
      req.user!.accountId!,
      dto.managerContent
    );
    return { message: "Reply sent", feedback };
  }

  @Patch("/:id/hide")
  @UseBefore(Manager)
  async toggleHide(@Param("id") id: string, @Body({ validate: false }) body: unknown) {
    const dto = parseBody(hideSchema, body);
    const feedback = await this.feedbackService.toggleHide(id, dto.isHidden);
    return { message: dto.isHidden ? "Feedback hidden" : "Feedback visible", feedback };
  }

  @Delete("/:id")
  @UseBefore(Manager)
  @OnUndefined(204)
  async delete(@Param("id") id: string) {
    await this.feedbackService.deleteFeedback(id);
  }
}

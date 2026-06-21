import { Service } from "typedi";
import { Controller, Get, Param, Delete, OnUndefined, QueryParam, Res } from "routing-controllers";
import { FeedbackService } from "../services/feedback.service";
import ExcelJS from "exceljs";
import { Response } from "express";

@Service()
@Controller("/feedbacks")
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

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
  async exportFeedbacks(@Res() res: Response) {
    const feedbacks = await this.feedbackService.getAllFeedbacks();
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Feedbacks");
    worksheet.columns = [
      { header: "Product Name", key: "productName", width: 30 },
      { header: "Account Name", key: "accountName", width: 25 },
      { header: "Content", key: "content", width: 50 },
      { header: "Created At", key: "createdAt", width: 20 },
    ];
    feedbacks.forEach((fb) => {
      worksheet.addRow({
        productName: (fb as any).product?.name || "",
        accountName: (fb as any).customer?.name || (fb as any).customer?.username || (fb as any).customer?.email || "",
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

  @Delete("/:id")
  @OnUndefined(204)
  async delete(@Param("id") id: string) {
    await this.feedbackService.deleteFeedback(id);
  }
}

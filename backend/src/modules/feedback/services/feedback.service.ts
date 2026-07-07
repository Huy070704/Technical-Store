import { Service } from "typedi";
import { Types } from "mongoose";
import { Feedback } from "../models/feedback.model";
import { EntityNotFoundException } from "@/shared/exceptions/http-exceptions";
import { MailService } from "@/utils/mail.service";

/** Populate tương đương relations product(images,category) + customer (Account). */
const FEEDBACK_POPULATE = [
  {
    path: "product",
    populate: [{ path: "images" }, { path: "category" }],
  },
  { path: "customer" },
  { path: "manager" },
] as const;

export interface FeedbackManagementFilters {
  keyword?: string;
  rating?: number;
  productId?: string;
  status?: "all" | "visible" | "hidden" | "replied" | "unreplied";
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

@Service()
export class FeedbackService {
  constructor(private readonly mailService: MailService) {}

  async sendContactEmail(dto: {
    user_name: string;
    user_email: string;
    phone_number?: string;
    service?: string;
    message: string;
  }): Promise<void> {
    await this.mailService.sendContactRequestMail(
      dto.user_name,
      dto.user_email,
      dto.phone_number ?? "",
      dto.service ?? "",
      dto.message
    );
  }

  private buildManagementQuery(filters: FeedbackManagementFilters) {
    const query: Record<string, unknown> = {};

    if (filters.keyword?.trim()) {
      query.customerContent = { $regex: filters.keyword.trim(), $options: "i" };
    }

    if (filters.rating && filters.rating >= 1 && filters.rating <= 5) {
      query.rating = filters.rating;
    }

    if (filters.productId && Types.ObjectId.isValid(filters.productId)) {
      query.product = filters.productId;
    }

    switch (filters.status) {
      case "visible":
        query.isHidden = false;
        break;
      case "hidden":
        query.isHidden = true;
        break;
      case "replied":
        query.managerContent = { $nin: [null, ""] };
        break;
      case "unreplied":
        query.$or = [{ managerContent: null }, { managerContent: "" }];
        break;
      default:
        break;
    }

    if (filters.fromDate || filters.toDate) {
      const createdAt: Record<string, Date> = {};
      if (filters.fromDate) {
        const from = new Date(filters.fromDate);
        if (!Number.isNaN(from.getTime())) createdAt.$gte = from;
      }
      if (filters.toDate) {
        const to = new Date(filters.toDate);
        if (!Number.isNaN(to.getTime())) {
          to.setHours(23, 59, 59, 999);
          createdAt.$lte = to;
        }
      }
      if (Object.keys(createdAt).length > 0) query.createdAt = createdAt;
    }

    return query;
  }

  async getAllFeedbacks() {
    return Feedback.find()
      .populate(FEEDBACK_POPULATE as any)
      .sort({ createdAt: -1 });
  }

  async getFeedbackById(id: string) {
    const feedback = await Feedback.findById(id).populate([
      ...FEEDBACK_POPULATE,
      { path: "images" },
      { path: "order" },
    ] as any);
    if (!feedback) throw new EntityNotFoundException("Feedback");
    return feedback;
  }

  async deleteFeedback(id: string) {
    const feedback = await Feedback.findById(id);
    if (!feedback) throw new EntityNotFoundException("Feedback");
    return feedback.softRemove();
  }

  async getFeedbacksPaginated(page: number, pageSize: number) {
    const [data, total] = await Promise.all([
      Feedback.find({ isHidden: { $ne: true } })
        .populate(FEEDBACK_POPULATE as any)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Feedback.countDocuments({ isHidden: { $ne: true } }),
    ]);
    return { data, total };
  }

  async getFeedbacksByProduct(productId: string) {
    return Feedback.find({ product: productId, isHidden: { $ne: true } })
      .populate([{ path: "customer" }, { path: "images" }] as any)
      .sort({ createdAt: -1 });
  }

  async getFeedbacksForManagement(filters: FeedbackManagementFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? 10));
    const query = this.buildManagementQuery(filters);

    const [data, total] = await Promise.all([
      Feedback.find(query)
        .populate(FEEDBACK_POPULATE as any)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Feedback.countDocuments(query),
    ]);

    return { data, total, page, pageSize };
  }

  async getStatistics() {
    const [total, hiddenCount, repliedCount, ratingAgg] = await Promise.all([
      Feedback.countDocuments(),
      Feedback.countDocuments({ isHidden: true }),
      Feedback.countDocuments({ managerContent: { $nin: [null, ""] } }),
      Feedback.aggregate([
        { $match: { isHidden: { $ne: true } } },
        { $group: { _id: null, avgRating: { $avg: "$rating" } } },
      ]),
    ]);

    const averageRating =
      ratingAgg.length > 0 ? Math.round((ratingAgg[0].avgRating ?? 0) * 10) / 10 : 0;
    const visibleTotal = total - hiddenCount;
    const replyRate =
      visibleTotal > 0 ? Math.round((repliedCount / visibleTotal) * 1000) / 10 : 0;

    return {
      total,
      visibleTotal,
      hiddenCount,
      repliedCount,
      averageRating,
      replyRate,
    };
  }

  async replyToFeedback(id: string, managerId: string, managerContent: string) {
    const feedback = await Feedback.findByIdAndUpdate(
      id,
      { manager: managerId, managerContent },
      { new: true }
    ).populate([...FEEDBACK_POPULATE, { path: "images" }] as any);

    if (!feedback) throw new EntityNotFoundException("Feedback");
    return feedback;
  }

  async toggleHide(id: string, isHidden: boolean) {
    const feedback = await Feedback.findByIdAndUpdate(
      id,
      { isHidden },
      { new: true }
    ).populate([...FEEDBACK_POPULATE, { path: "images" }] as any);

    if (!feedback) throw new EntityNotFoundException("Feedback");
    return feedback;
  }
}

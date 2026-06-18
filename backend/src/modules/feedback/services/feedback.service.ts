import { Service } from "typedi";
import { Feedback } from "../feedback.model";

/** Populate tương đương relations product(images,category) + account. */
const FEEDBACK_POPULATE = [
  {
    path: "product",
    populate: [{ path: "images" }, { path: "category" }],
  },
  { path: "account" },
] as const;

@Service()
export class FeedbackService {
  async getAllFeedbacks() {
    return Feedback.find()
      .populate(FEEDBACK_POPULATE as any)
      .sort({ createdAt: -1 });
  }

  async getFeedbackById(id: string) {
    return Feedback.findById(id).populate([
      ...FEEDBACK_POPULATE,
      { path: "images" },
    ] as any);
  }

  async deleteFeedback(id: string) {
    return Feedback.deleteOne({ _id: id });
  }

  async getFeedbacksPaginated(page: number, pageSize: number) {
    const [data, total] = await Promise.all([
      Feedback.find()
        .populate(FEEDBACK_POPULATE as any)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Feedback.countDocuments(),
    ]);
    return { data, total };
  }

  async getFeedbacksByProduct(productId: string) {
    return Feedback.find({ product: productId })
      .populate([{ path: "account" }, { path: "images" }] as any)
      .sort({ createdAt: -1 });
  }
}

import { Service } from "typedi";
import { Feedback } from "../feedback.entity";
import { DbConnection } from "@/database/dbConnection";

@Service()
export class FeedbackService {
  private get feedbackRepo() {
    return DbConnection.appDataSource.getRepository(Feedback);
  }

  async getAllFeedbacks() {
    return this.feedbackRepo.find({
      relations: ["product", "product.images", "product.category", "account"],
      order: { createdAt: "DESC" },
    });
  }

  async getFeedbackById(id: string) {
    return this.feedbackRepo.findOne({
      where: { id },
      relations: ["product", "product.images", "product.category", "account", "images"],
    });
  }

  async deleteFeedback(id: string) {
    return this.feedbackRepo.delete(id);
  }

  async getFeedbacksPaginated(page: number, pageSize: number) {
    const [data, total] = await this.feedbackRepo.findAndCount({
      relations: ["product", "product.images", "product.category", "account"],
      order: { createdAt: "DESC" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { data, total };
  }

  async getFeedbacksByProduct(productId: string) {
    return this.feedbackRepo.find({
      where: { product: { id: productId } },
      relations: ["account", "images"],
      order: { createdAt: "DESC" },
    });
  }
}

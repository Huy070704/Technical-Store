import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { ProductDocument } from "../../product/models/product.model";
import type { AccountDocument } from "../../auth/models/account.model";
import type { ImageDocument } from "../../image/models/image.model";
import type { OrderDocument } from "../../order/models/order.model";

export interface FeedbackFields extends BaseFields {
  customerContent: string;
  product: Types.ObjectId | ProductDocument;
  customer: Types.ObjectId | AccountDocument;
  order: Types.ObjectId | OrderDocument;
  rating: number;
  manager?: Types.ObjectId | AccountDocument | null;
  managerContent?: string | null;
  isHidden?: boolean;
}

export type FeedbackDocument = BaseDocument<FeedbackFields> & {
  images?: ImageDocument[];
};

const FeedbackSchema = new Schema<FeedbackDocument>(
  {
    customerContent: { type: String, required: true, maxlength: 500 },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    customer: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    manager: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    managerContent: { type: String, default: null, maxlength: 500 },
    isHidden: { type: Boolean, default: false },
  },
  { collection: "feedbacks" }
);

applyBaseSchema(FeedbackSchema);

// Composite Index xem feedback theo product, mới nhất trước
FeedbackSchema.index(
  { product: 1, createdAt: -1 },
  { name: "IDX_feedbacks_product_created_at" }
);
// Index khoá ngoại Customer
FeedbackSchema.index({ customer: 1 });
// Index khoá ngoại Order
FeedbackSchema.index({ order: 1 });
// Mỗi customer chỉ đánh giá 1 lần cho 1 sản phẩm trong 1 đơn (bỏ qua bản đã soft-delete)
FeedbackSchema.index(
  { order: 1, product: 1, customer: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
    name: "UQ_feedbacks_order_product_customer",
  }
);

// OneToMany Image
FeedbackSchema.virtual("images", {
  ref: "Image",
  localField: "_id",
  foreignField: "feedback",
});

export const Feedback = model<FeedbackDocument, ModelWithSoftDelete<FeedbackDocument>>(
  "Feedback",
  FeedbackSchema
);

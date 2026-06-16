import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { ProductDocument } from "@/modules/product/product.entity";
import type { AccountDocument } from "@/modules/auth/account.entity";
import type { ImageDocument } from "../image/image.entity";

export interface FeedbackFields extends BaseFields {
  content: string;
  product: Types.ObjectId | ProductDocument;
  account: Types.ObjectId | AccountDocument;
}

export type FeedbackDocument = BaseDocument<FeedbackFields> & {
  images?: ImageDocument[];
};

const FeedbackSchema = new Schema<FeedbackDocument>(
  {
    content: { type: String, required: true, maxlength: 500 },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    account: { type: Schema.Types.ObjectId, ref: "Account" },
  },
  { collection: "feedbacks" }
);

applyBaseSchema(FeedbackSchema);

// Composite Index xem feedback theo product, mới nhất trước
FeedbackSchema.index(
  { product: 1, createdAt: -1 },
  { name: "IDX_feedbacks_product_created_at" }
);
// Index khoá ngoại Account
FeedbackSchema.index({ account: 1 });

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

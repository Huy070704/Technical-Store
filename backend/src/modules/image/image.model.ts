import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { ProductDocument } from "../product/product.model";
import type { FeedbackDocument } from "../feedback/feedback.model";

export interface ImageFields extends BaseFields {
  originalName: string;
  url: string;
  name: string;
  product?: Types.ObjectId | ProductDocument | null;
  feedback?: Types.ObjectId | FeedbackDocument | null;
}

export type ImageDocument = BaseDocument<ImageFields>;

const ImageSchema = new Schema<ImageDocument>(
  {
    originalName: { type: String, maxlength: 255 },
    url: { type: String, maxlength: 255 },
    name: { type: String, maxlength: 255 },
    product: { type: Schema.Types.ObjectId, ref: "Product", default: null },
    feedback: { type: Schema.Types.ObjectId, ref: "Feedback", default: null },
  },
  { collection: "images" }
);

applyBaseSchema(ImageSchema);

export const Image = model<ImageDocument, ModelWithSoftDelete<ImageDocument>>(
  "Image",
  ImageSchema
);

import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  ModelWithSoftDelete,
  NamedFields,
} from "@/shared/mongoose/base";
import type { CategoryDocument } from "./category.model";

/**
 * Product — sản phẩm. categoryId là khoá ngoại (ref Category); `category` là
 * virtual populate cho phép truy cập category đã populate.
 */
export interface ProductFields extends NamedFields {
  isActive: boolean;
  price?: number;
  description?: string;
  stock?: number;
  categoryId?: Types.ObjectId;
  image?: string | null;
}

export type ProductDocument = BaseDocument<ProductFields> & {
  category?: CategoryDocument | null;
  images?: any[];
};

const ProductSchema = new Schema<ProductDocument>(
  {
    isActive: { type: Boolean, default: true },
    price: { type: Number, default: null },
    description: { type: String, default: null },
    stock: { type: Number, default: null },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", default: null },
    image: { type: String, default: null },
  },
  { collection: "products" }
);

applyBaseSchema(ProductSchema, { named: true });

// Virtual populate Category (qua categoryId)
ProductSchema.virtual("category", {
  ref: "Category",
  localField: "categoryId",
  foreignField: "_id",
  justOne: true,
});

// Virtual populate danh sách Image (Image giữ khoá ngoại product)
ProductSchema.virtual("images", {
  ref: "Image",
  localField: "_id",
  foreignField: "product",
});



export const Product = model<ProductDocument, ModelWithSoftDelete<ProductDocument>>(
  "Product",
  ProductSchema
);

// src/product/category.model.ts
import { model, Schema } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  ModelWithSoftDelete,
  NamedFields,
} from "@/shared/mongoose/base";

// Category: name + slug. Quan hệ 1-nhiều với Product — phía Product giữ categoryId.
export interface CategoryFields extends NamedFields {}

export type CategoryDocument = BaseDocument<CategoryFields>;

const CategorySchema = new Schema<CategoryDocument>(
  {},
  { collection: "categories" }
);

applyBaseSchema(CategorySchema, { named: true });

export const Category = model<CategoryDocument, ModelWithSoftDelete<CategoryDocument>>(
  "Category",
  CategorySchema
);

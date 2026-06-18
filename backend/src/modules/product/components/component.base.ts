import { Schema, SchemaDefinition } from "mongoose";
import { applyBaseSchema, BaseDocument, BaseFields } from "@/shared/mongoose/base";
import type { Types } from "mongoose";
import type { ProductDocument } from "../product.model";

/**
 * Mọi component (CPU, GPU, RAM, ...) có quan hệ 1-1 với Product —
 * component giữ khoá ngoại `product`.
 */
export interface ComponentBaseFields extends BaseFields {
  product: Types.ObjectId | ProductDocument;
}

export type ComponentDocument<TFields> = BaseDocument<TFields & { product: Types.ObjectId | ProductDocument }>;

/** Dựng schema cho một component với trường `product` ref + các trường riêng. */
export function buildComponentSchema<TDoc>(
  fields: SchemaDefinition,
  collection: string
): Schema<TDoc> {
  const schema = new Schema<TDoc>(
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        unique: true,
        sparse: true,
      },
      ...fields,
    } as SchemaDefinition,
    { collection }
  );
  applyBaseSchema(schema);
  return schema;
}

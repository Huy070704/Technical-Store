import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { ProductDocument } from "@/modules/product/product.model";
import type { FacilityDocument } from "@/modules/facility/facility.model";
import type { InventoryDetailDocument } from "./inventoryDetail.model";

export interface InventoryFields extends BaseFields {
  facility: Types.ObjectId | FacilityDocument;
  product: Types.ObjectId | ProductDocument;
  quantity: number;
  minimumStockLevel: number;
}

export type InventoryDocument = BaseDocument<InventoryFields> & {
  details?: InventoryDetailDocument[];
};

const InventorySchema = new Schema<InventoryDocument>(
  {
    facility: { type: Schema.Types.ObjectId, ref: "Facility", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, default: 0 },
    minimumStockLevel: { type: Number, default: 0 },
  },
  { collection: "inventories" }
);

applyBaseSchema(InventorySchema);

InventorySchema.virtual("details", {
  ref: "InventoryDetail",
  localField: "_id",
  foreignField: "inventory",
});

export const Inventory = model<InventoryDocument, ModelWithSoftDelete<InventoryDocument>>(
  "Inventory",
  InventorySchema
);

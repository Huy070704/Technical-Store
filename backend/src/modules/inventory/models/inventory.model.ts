import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { ProductDocument } from "../../product/models/product.model";
import type { FacilityDocument } from "../../facility/models/facility.model";
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

// ── Indexes ────────────────────────────────────────────────────────────
InventorySchema.index({ product: 1, deletedAt: 1 }, { name: "IDX_inventories_product_deleted" });
InventorySchema.index({ facility: 1, deletedAt: 1 }, { name: "IDX_inventories_facility_deleted" });
InventorySchema.index(
  { facility: 1, product: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
    name: "IDX_inventories_facility_product",
  }
);

export const Inventory = model<InventoryDocument, ModelWithSoftDelete<InventoryDocument>>(
  "Inventory",
  InventorySchema
);

import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { InventoryDocument } from "./inventory.entity";

export interface InventoryDetailFields extends BaseFields {
  inventory: Types.ObjectId | InventoryDocument;
  serialNumber?: string;
  batchNumber?: string;
  quantity: number;
}

export type InventoryDetailDocument = BaseDocument<InventoryDetailFields>;

const InventoryDetailSchema = new Schema<InventoryDetailDocument>(
  {
    inventory: { type: Schema.Types.ObjectId, ref: "Inventory", required: true },
    serialNumber: { type: String, maxlength: 100, default: null },
    batchNumber: { type: String, maxlength: 100, default: null },
    quantity: { type: Number, default: 1 },
  },
  { collection: "inventory_details" }
);

applyBaseSchema(InventoryDetailSchema);

export const InventoryDetail = model<
  InventoryDetailDocument,
  ModelWithSoftDelete<InventoryDetailDocument>
>("InventoryDetail", InventoryDetailSchema);

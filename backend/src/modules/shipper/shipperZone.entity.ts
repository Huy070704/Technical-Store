import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { AccountDocument } from "@/modules/auth/account.entity";

export interface ShipperZoneFields extends BaseFields {
  shipper: Types.ObjectId | AccountDocument;
  province: string;
  district?: string;
  ward?: string;
}

export type ShipperZoneDocument = BaseDocument<ShipperZoneFields>;

const ShipperZoneSchema = new Schema<ShipperZoneDocument>(
  {
    shipper: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    province: { type: String, required: true },
    district: { type: String, default: null },
    ward: { type: String, default: null },
  },
  { collection: "shipper_zones" }
);

applyBaseSchema(ShipperZoneSchema);

export const ShipperZone = model<ShipperZoneDocument, ModelWithSoftDelete<ShipperZoneDocument>>(
  "ShipperZone",
  ShipperZoneSchema
);

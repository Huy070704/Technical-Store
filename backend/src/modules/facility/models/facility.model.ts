import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  ModelWithSoftDelete,
  NamedFields,
} from "@/shared/mongoose/base";
import type { AccountDocument } from "../../auth/models/account.model";

export interface FacilityFields extends NamedFields {
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  manager?: Types.ObjectId | AccountDocument | null;
  latitude?: number;
  longitude?: number;
}

export type FacilityDocument = BaseDocument<FacilityFields> & {
  staffs?: any[];
  inventories?: any[];
  importReceipts?: any[];
};

const FacilitySchema = new Schema<FacilityDocument>(
  {
    address: { type: String, maxlength: 255, default: null },
    phone: { type: String, maxlength: 20, default: null },
    email: { type: String, maxlength: 255, default: null },
    isActive: { type: Boolean, default: true },
    manager: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
  },
  { collection: "facilities" }
);

applyBaseSchema(FacilitySchema, { named: true });

// Staff assigned to the facility (Account.facility)
FacilitySchema.virtual("staffs", {
  ref: "Account",
  localField: "_id",
  foreignField: "facility",
});
// Inventories at the facility
FacilitySchema.virtual("inventories", {
  ref: "Inventory",
  localField: "_id",
  foreignField: "facility",
});
// Import receipts at the facility
FacilitySchema.virtual("importReceipts", {
  ref: "ImportReceipt",
  localField: "_id",
  foreignField: "facility",
});

export const Facility = model<FacilityDocument, ModelWithSoftDelete<FacilityDocument>>(
  "Facility",
  FacilitySchema
);

import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { FacilityDocument } from "../../facility/models/facility.model";
import type { AccountDocument } from "../../auth/models/account.model";

export type StaffRequestStatus = "pending" | "approved" | "rejected";
export type StaffRequestRole = "staff" | "manager" | "shipper";

export interface StaffRequestFields extends BaseFields {
  facility: Types.ObjectId | FacilityDocument;
  requestedBy: Types.ObjectId | AccountDocument;
  roleNeeded: StaffRequestRole;
  quantity: number;
  reason: string;
  status: StaffRequestStatus;
  reviewedBy?: Types.ObjectId | AccountDocument | null;
  reviewedAt?: Date | null;
  adminNote?: string | null;
}

export type StaffRequestDocument = BaseDocument<StaffRequestFields>;

const StaffRequestSchema = new Schema<StaffRequestDocument>(
  {
    facility: { type: Schema.Types.ObjectId, ref: "Facility", required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    roleNeeded: {
      type: String,
      enum: ["staff", "manager", "shipper"],
      required: true,
    },
    quantity: { type: Number, required: true, min: 1, max: 50 },
    reason: { type: String, required: true, maxlength: 500 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    reviewedAt: { type: Date, default: null },
    adminNote: { type: String, default: null, maxlength: 500 },
  },
  { collection: "staff_requests" }
);

applyBaseSchema(StaffRequestSchema);

StaffRequestSchema.index({ status: 1, createdAt: -1 });
StaffRequestSchema.index({ facility: 1, requestedBy: 1 });

export const StaffRequest = model<StaffRequestDocument, ModelWithSoftDelete<StaffRequestDocument>>(
  "StaffRequest",
  StaffRequestSchema
);

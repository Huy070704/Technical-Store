import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { AccountDocument } from "@/modules/auth/account.entity";

export interface CustomerFields extends BaseFields {
  fullName?: string;
  address?: string;
  gender?: string;
  dateOfBirth?: Date;
  rewardPoints: number;
  membershipTier?: string;
  account: Types.ObjectId | AccountDocument;
}

export type CustomerDocument = BaseDocument<CustomerFields>;

const CustomerSchema = new Schema<CustomerDocument>(
  {
    fullName: { type: String, default: null },
    address: { type: String, default: null },
    gender: { type: String, default: null },
    dateOfBirth: { type: Date, default: null },
    rewardPoints: { type: Number, default: 0 },
    membershipTier: { type: String, default: null },
    account: { type: Schema.Types.ObjectId, ref: "Account", required: true },
  },
  { collection: "customers" }
);

applyBaseSchema(CustomerSchema);

export const Customer = model<CustomerDocument, ModelWithSoftDelete<CustomerDocument>>(
  "Customer",
  CustomerSchema
);

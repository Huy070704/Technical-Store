import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { AccountDocument } from "../../auth/models/account.model";

/** Lưu mã OTP gửi qua email. */
export interface OtpFields extends BaseFields {
  email: string;
  code: string;
  verified: boolean;
  expiresAt?: Date | null;
  account?: Types.ObjectId | AccountDocument | null;
}

export type OtpDocument = BaseDocument<OtpFields>;

const OtpSchema = new Schema<OtpDocument>(
  {
    email: { type: String, required: true },
    code: { type: String, required: true, maxlength: 6 },
    verified: { type: Boolean, default: false },
    expiresAt: { type: Date, default: null },
    account: { type: Schema.Types.ObjectId, ref: "Account", default: null },
  },
  { collection: "otps" }
);

applyBaseSchema(OtpSchema);

export const Otp = model<OtpDocument, ModelWithSoftDelete<OtpDocument>>("Otp", OtpSchema);

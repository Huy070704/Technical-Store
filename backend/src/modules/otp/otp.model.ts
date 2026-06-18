import { model, Schema } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";

/** Lưu mã OTP gửi qua email. */
export interface OtpFields extends BaseFields {
  email: string;
  code: string;
  verified: boolean;
  /** epoch milliseconds (so sánh: Number(otp.expiresAtMs) > Date.now()) */
  expiresAtMs?: number;
}

export type OtpDocument = BaseDocument<OtpFields>;

const OtpSchema = new Schema<OtpDocument>(
  {
    email: { type: String, required: true },
    code: { type: String, required: true, maxlength: 6 },
    verified: { type: Boolean, default: false },
    expiresAtMs: { type: Number, default: null },
  },
  { collection: "otps" }
);

applyBaseSchema(OtpSchema);

export const Otp = model<OtpDocument, ModelWithSoftDelete<OtpDocument>>("Otp", OtpSchema);

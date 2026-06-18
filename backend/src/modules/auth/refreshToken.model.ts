import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { AccountDocument } from "./account.model";

/** RefreshToken — token làm mới phiên đăng nhập, gắn với một Account. */
export interface RefreshTokenFields extends BaseFields {
  token: string;
  expiredAt: Date;
  account: Types.ObjectId | AccountDocument;
}

export type RefreshTokenDocument = BaseDocument<RefreshTokenFields>;

const RefreshTokenSchema = new Schema<RefreshTokenDocument>(
  {
    token: { type: String, required: true },
    expiredAt: { type: Date, required: true },
    account: { type: Schema.Types.ObjectId, ref: "Account", required: true },
  },
  { collection: "refresh_tokens" }
);

applyBaseSchema(RefreshTokenSchema);

// 1. Unique Index cho token: xác thực token siêu tốc khi refresh
RefreshTokenSchema.index({ token: 1 }, { unique: true, name: "UQ_refresh_tokens_token" });
// 2. Index khoá ngoại Account: đăng xuất / thu hồi toàn bộ thiết bị
RefreshTokenSchema.index({ account: 1 });

export const RefreshToken = model<
  RefreshTokenDocument,
  ModelWithSoftDelete<RefreshTokenDocument>
>("RefreshToken", RefreshTokenSchema);

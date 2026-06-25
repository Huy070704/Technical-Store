import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  ModelWithSoftDelete,
  NamedFields,
} from "@/shared/mongoose/base";
import type { RoleDocument } from "./role.model";

/**
 * Account — tài khoản người dùng (customer/staff/manager/admin).
 * Có name + slug dùng chung từ base schema.
 */
export interface AccountFields extends NamedFields {
  username?: string | null;
  email: string;
  password?: string;
  phone?: string;
  address?: string | null;
  addresses?: string[];
  isRegistered: boolean;
  avatar?: string;
  isBlocked: boolean;
  role: Types.ObjectId | RoleDocument;
  facility?: Types.ObjectId | null;
}

export type AccountDocument = BaseDocument<AccountFields>;

const AccountSchema = new Schema<AccountDocument>(
  {
    username: { type: String, unique: true, sparse: true, default: null },
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    phone: { type: String, default: null },
    address: { type: String, default: null },
    addresses: { type: [String], default: [] },
    isRegistered: { type: Boolean, required: true, default: false },
    avatar: { type: String, default: null },
    isBlocked: { type: Boolean, required: true, default: false },

    // ManyToOne Role
    role: { type: Schema.Types.ObjectId, ref: "Role", default: null },

    // ManyToOne Facility (nơi làm việc)
    facility: { type: Schema.Types.ObjectId, ref: "Facility", default: null },
  },
  { collection: "accounts" }
);

// keepExistingSlug: giữ nguyên slug nếu đã set thủ công (override generateSlug của Account)
applyBaseSchema(AccountSchema, { named: true, keepExistingSlug: true });

// 1. Index khoá ngoại Role (JOIN kiểm tra quyền)
AccountSchema.index({ role: 1 });
// 2. Index Phone (tìm khách hàng, đăng nhập SĐT, gửi SMS)
AccountSchema.index({ phone: 1 });

export const Account = model<AccountDocument, ModelWithSoftDelete<AccountDocument>>(
  "Account",
  AccountSchema
);

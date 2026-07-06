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
    username: { type: String, default: undefined },
    // Không đặt unique inline: dùng partial unique index bên dưới để soft-delete không chiếm chỗ email.
    email: { type: String, required: true },
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

// 0. Partial unique index cho email: chỉ áp cho tài khoản CHƯA soft-delete (deletedAt=null).
//    Nhờ vậy đăng ký lại / tạo lại cùng email sau khi tài khoản cũ bị soft-remove không bị E11000.
AccountSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null }, name: "UQ_accounts_email_active" }
);
// 1. Index khoá ngoại Role (JOIN kiểm tra quyền)
AccountSchema.index({ role: 1 });
// 2. Index Phone (tìm khách hàng, đăng nhập SĐT, gửi SMS)
AccountSchema.index({ phone: 1 });
// 3. Partial unique index cho username: chỉ áp cho tài khoản CÓ username và CHƯA soft-delete.
//    Nhờ vậy đăng ký lại cùng username sau khi tài khoản cũ bị soft-remove không bị E11000
//    (tương tự index email ở trên).
AccountSchema.index(
  { username: 1 },
  {
    unique: true,
    partialFilterExpression: { username: { $type: "string" }, deletedAt: null },
    name: "UQ_accounts_username_active",
  }
);

export const Account = model<AccountDocument, ModelWithSoftDelete<AccountDocument>>(
  "Account",
  AccountSchema
);

import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  ModelWithSoftDelete,
  NamedFields,
} from "@/shared/mongoose/base";
import type { RoleDocument } from "./role.entity";

/**
 * Account — tài khoản người dùng (customer/staff/shipper/manager/admin).
 * Có name + slug dùng chung từ base schema.
 */
export interface AccountFields extends NamedFields {
  email: string;
  password?: string;
  phone?: string;
  isRegistered: boolean;
  googleId?: string;
  avatar?: string;
  isBlocked: boolean;
  role: Types.ObjectId | RoleDocument;
  facility?: Types.ObjectId | null;
  // Shipper-specific
  maxOrdersPerDay: number;
  currentOrdersToday: number;
  isAvailable: boolean;
  priority: number;
  lastOrderDate?: Date | null;
}

export type AccountDocument = BaseDocument<AccountFields>;

const AccountSchema = new Schema<AccountDocument>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, default: null },
    phone: { type: String, default: null },
    isRegistered: { type: Boolean, required: true, default: false },
    googleId: { type: String, default: null, unique: true, sparse: true },
    avatar: { type: String, default: null },
    isBlocked: { type: Boolean, required: true, default: false },

    // ManyToOne Role
    role: { type: Schema.Types.ObjectId, ref: "Role", default: null },

    // ManyToOne Facility (nơi làm việc)
    facility: { type: Schema.Types.ObjectId, ref: "Facility", default: null },

    // Shipper-specific fields
    maxOrdersPerDay: { type: Number, default: 0 },
    currentOrdersToday: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: true },
    priority: { type: Number, default: 1 },
    lastOrderDate: { type: Date, default: null },
  },
  { collection: "accounts" }
);

// keepExistingSlug: giữ nguyên slug nếu đã set thủ công (override generateSlug của Account)
applyBaseSchema(AccountSchema, { named: true, keepExistingSlug: true });

// 1. Index khoá ngoại Role (JOIN kiểm tra quyền)
AccountSchema.index({ role: 1 });
// 2. Index Phone (tìm khách hàng, đăng nhập SĐT, gửi SMS)
AccountSchema.index({ phone: 1 });
// 3. Composite Index cho thuật toán gán đơn cho Shipper
AccountSchema.index(
  { isAvailable: 1, priority: 1, currentOrdersToday: 1 },
  { name: "IDX_shipper_assignment" }
);

export const Account = model<AccountDocument, ModelWithSoftDelete<AccountDocument>>(
  "Account",
  AccountSchema
);

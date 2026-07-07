import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { OrderDocument } from "../../order/models/order.model";

/**
 * Trạng thái thanh toán chuẩn (đồng bộ cho cả đơn online lẫn tại quầy).
 * Chỉ dùng các giá trị này khi GHI mới. Dữ liệu cũ ("pending"/"completed"/…)
 * được chuẩn hóa qua `normalizePaymentStatus` khi ĐỌC.
 */
export enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
  FAILED = "FAILED",
}

/** Chuẩn hóa mọi biến thể (hoa/thường, "completed", "success"…) về PaymentStatus. */
export const normalizePaymentStatus = (raw?: string | null): PaymentStatus => {
  const s = (raw ?? "").toUpperCase();
  if (s === "PAID" || s === "COMPLETED" || s === "SUCCESS" || s === "SUCCESSFUL") return PaymentStatus.PAID;
  if (s === "CANCELLED" || s === "CANCELED") return PaymentStatus.CANCELLED;
  if (s === "FAILED" || s === "FAILURE") return PaymentStatus.FAILED;
  return PaymentStatus.PENDING;
};

/** Payment được coi là đã thu tiền hay chưa (chấp nhận cả dữ liệu cũ). */
export const isPaidStatus = (raw?: string | null): boolean =>
  normalizePaymentStatus(raw) === PaymentStatus.PAID;

export interface PaymentFields extends BaseFields {
  order: Types.ObjectId | OrderDocument;
  amount: number;
  status: string;
  method: string;
  payosOrderCode?: string;
  paidAt?: Date | null;
}

export type PaymentDocument = BaseDocument<PaymentFields>;

const PaymentSchema = new Schema<PaymentDocument>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    amount: { type: Number, required: true },
    status: { type: String, required: true, maxlength: 50 },
    method: { type: String, required: true, maxlength: 50 },
    payosOrderCode: { type: String, default: undefined },
    paidAt: { type: Date, default: null },
  },
  { collection: "payments" }
);

applyBaseSchema(PaymentSchema);

// 1. Index khoá ngoại order
PaymentSchema.index({ order: 1 });
// 2. Unique Index mã đơn PayOS (sparse — cho phép null khi chưa có mã)
PaymentSchema.index(
  { payosOrderCode: 1 },
  { unique: true, sparse: true, name: "IDX_payments_payos_code" }
);

export const Payment = model<PaymentDocument, ModelWithSoftDelete<PaymentDocument>>(
  "Payment",
  PaymentSchema
);

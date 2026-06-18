import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { OrderDocument } from "@/modules/order/order.model";

export interface PaymentFields extends BaseFields {
  order: Types.ObjectId | OrderDocument;
  amount: number;
  status: string;
  method: string;
  payosOrderCode?: string;
}

export type PaymentDocument = BaseDocument<PaymentFields>;

const PaymentSchema = new Schema<PaymentDocument>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    amount: { type: Number, required: true },
    status: { type: String, required: true, maxlength: 50 },
    method: { type: String, required: true, maxlength: 50 },
    payosOrderCode: { type: String, default: null },
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

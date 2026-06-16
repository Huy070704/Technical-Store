import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { OrderDocument } from "@/modules/order/order.entity";
import type { PaymentDocument } from "./payment.entity";

export enum InvoiceStatus {
  UNPAID = "UNPAID",
  PAID = "PAID",
  CANCELLED = "CANCELLED",
}

export interface InvoiceFields extends BaseFields {
  order: Types.ObjectId | OrderDocument;
  payment?: Types.ObjectId | PaymentDocument | null;
  invoiceNumber: string | null;
  totalAmount: number;
  status: InvoiceStatus;
  paymentMethod: string | null;
  paidAt?: Date | null;
  notes?: string;
}

export type InvoiceDocument = BaseDocument<InvoiceFields>;

const InvoiceSchema = new Schema<InvoiceDocument>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    payment: { type: Schema.Types.ObjectId, ref: "Payment", default: null },
    invoiceNumber: { type: String, default: null },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.UNPAID,
    },
    paymentMethod: { type: String, default: null },
    paidAt: { type: Date, default: null },
    notes: { type: String, default: null },
  },
  { collection: "invoices" }
);

applyBaseSchema(InvoiceSchema);

// 1. Index khoá ngoại Order
InvoiceSchema.index({ order: 1 });
// 2. Index khoá ngoại Payment
InvoiceSchema.index({ payment: 1 });
// 3. Composite Index báo cáo theo trạng thái + thời gian thanh toán
InvoiceSchema.index({ status: 1, paidAt: 1 }, { name: "IDX_invoices_status_paid_at" });
// 4. Unique invoiceNumber (sparse — cho phép null)
InvoiceSchema.index({ invoiceNumber: 1 }, { unique: true, sparse: true });

export const Invoice = model<InvoiceDocument, ModelWithSoftDelete<InvoiceDocument>>(
  "Invoice",
  InvoiceSchema
);

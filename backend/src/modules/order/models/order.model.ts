import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { AccountDocument } from "../../auth/models/account.model";
import type { OrderDetailDocument } from "./orderDetail.model";

export enum OrderStatus {
  PENDING = "PENDING",
  ASSIGNED = "ASSIGNED",
  PROCESSING = "PROCESSING",
  SHIPPING = "SHIPPING",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
  RETURNED = "RETURNED",
}

export interface OrderFields extends BaseFields {
  customerIdOrder?: Types.ObjectId | AccountDocument | null;
  staffIdOrder?: Types.ObjectId | AccountDocument | null;
  facility?: Types.ObjectId | null;
  orderType: number;
  status: OrderStatus;
  totalAmount: number;
  subtotalAmount: number;
  shippingFee: number;
  vatAmount: number;
  requireInvoice: boolean;
  shippingAddress?: string;
  note?: string;
  cancelReason?: string;
  paymentMethod?: string;
  orderAt: Date;
  cancelAt?: Date | null;
  confirmedAt?: Date | null;
  completedAt?: Date | null;
  guestName?: string | null;
  guestPhone?: string | null;
  guestAddress?: string | null;
  guestEmail?: string | null;
}

export type OrderDocument = BaseDocument<OrderFields> & {
  orderDetails?: OrderDetailDocument[];
  payments?: any[];
  invoices?: any[];
};

const OrderSchema = new Schema<OrderDocument>(
  {
    customerIdOrder: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    staffIdOrder: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    facility: { type: Schema.Types.ObjectId, ref: "Facility", default: null },
    orderType: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
    },
    totalAmount: { type: Number, required: true },
    subtotalAmount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    requireInvoice: { type: Boolean, default: false },
    shippingAddress: { type: String, default: null },
    note: { type: String, default: null },
    cancelReason: { type: String, default: null },
    paymentMethod: { type: String, default: null },
    orderAt: { type: Date, required: true, default: () => new Date() },
    cancelAt: { type: Date, default: null },
    confirmedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    guestName: { type: String, default: null },
    guestPhone: { type: String, default: null },
    guestAddress: { type: String, default: null },
    guestEmail: { type: String, default: null },
  },
  { collection: "orders" }
);

applyBaseSchema(OrderSchema);

// Index nhân viên phụ trách
OrderSchema.index({ staffIdOrder: 1 });
// Composite Index khách hàng + ngày đặt đơn
OrderSchema.index({ customerIdOrder: 1, orderAt: -1 }, { name: "IDX_orders_customer_date" });
// Composite Index trạng thái + ngày đặt đơn
OrderSchema.index({ status: 1, orderAt: -1 }, { name: "IDX_orders_status_date" });

// OneToMany relations
OrderSchema.virtual("orderDetails", {
  ref: "OrderDetail",
  localField: "_id",
  foreignField: "order",
});
OrderSchema.virtual("payments", {
  ref: "Payment",
  localField: "_id",
  foreignField: "order",
});
OrderSchema.virtual("invoices", {
  ref: "Invoice",
  localField: "_id",
  foreignField: "order",
});

export const Order = model<OrderDocument, ModelWithSoftDelete<OrderDocument>>("Order", OrderSchema);

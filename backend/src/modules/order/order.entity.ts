import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { AccountDocument } from "@/modules/auth/account.entity";
import type { OrderDetailDocument } from "./orderDetail.entity";

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
  customer: Types.ObjectId | AccountDocument | null;
  shipper: Types.ObjectId | AccountDocument | null;
  orderDate: Date;
  status: OrderStatus;
  subtotalAmount: number;
  shippingFee: number;
  vatAmount: number;
  totalAmount: number;
  shippingAddress?: string;
  note?: string;
  cancelReason?: string;
  paymentMethod?: string;
  requireInvoice: boolean;
}

export type OrderDocument = BaseDocument<OrderFields> & {
  orderDetails?: OrderDetailDocument[];
  payments?: any[];
  invoices?: any[];
};

const OrderSchema = new Schema<OrderDocument>(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    shipper: { type: Schema.Types.ObjectId, ref: "Account", default: null },
    orderDate: { type: Date, required: true },
    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING,
    },
    subtotalAmount: { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    shippingAddress: { type: String, default: null },
    note: { type: String, default: null },
    cancelReason: { type: String, default: null },
    paymentMethod: { type: String, default: null },
    requireInvoice: { type: Boolean, default: false },
  },
  { collection: "orders" }
);

applyBaseSchema(OrderSchema);

// Index đơn cho Shipper
OrderSchema.index({ shipper: 1 });
// Composite Index khách hàng + ngày
OrderSchema.index({ customer: 1, orderDate: -1 }, { name: "IDX_orders_customer_date" });
// Composite Index trạng thái + ngày
OrderSchema.index({ status: 1, orderDate: -1 }, { name: "IDX_orders_status_date" });

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

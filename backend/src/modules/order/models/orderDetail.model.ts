import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { OrderDocument } from "./order.model";
import type { ProductDocument } from "../../product/models/product.model";

export interface OrderDetailFields extends BaseFields {
  order: Types.ObjectId | OrderDocument;
  product: Types.ObjectId | ProductDocument;
  quantity: number;
  unitPrice: number;
}

export type OrderDetailDocument = BaseDocument<OrderDetailFields>;

const OrderDetailSchema = new Schema<OrderDetailDocument>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order" },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
  },
  { collection: "order_details" }
);

applyBaseSchema(OrderDetailSchema);

OrderDetailSchema.index({ order: 1 });
OrderDetailSchema.index({ product: 1 });

export const OrderDetail = model<OrderDetailDocument, ModelWithSoftDelete<OrderDetailDocument>>(
  "OrderDetail",
  OrderDetailSchema
);

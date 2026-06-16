import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { CartDocument } from "./cart.entity";
import type { ProductDocument } from "@/modules/product/product.entity";

/** CartItem — dòng sản phẩm trong giỏ. */
export interface CartItemFields extends BaseFields {
  quantity: number;
  cart: Types.ObjectId | CartDocument;
  product: Types.ObjectId | ProductDocument;
}

export type CartItemDocument = BaseDocument<CartItemFields>;

const CartItemSchema = new Schema<CartItemDocument>(
  {
    quantity: { type: Number, required: true },
    cart: { type: Schema.Types.ObjectId, ref: "Cart" },
    product: { type: Schema.Types.ObjectId, ref: "Product" },
  },
  { collection: "cart_items" }
);

applyBaseSchema(CartItemSchema);

// 1. Unique composite (cart, product) — chặn trùng item
CartItemSchema.index(
  { cart: 1, product: 1 },
  { unique: true, name: "UQ_cart_items_cart_product" }
);
// 2. Index product — tra cứu ngược
CartItemSchema.index({ product: 1 });

export const CartItem = model<CartItemDocument, ModelWithSoftDelete<CartItemDocument>>(
  "CartItem",
  CartItemSchema
);

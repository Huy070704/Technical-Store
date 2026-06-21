import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { AccountDocument } from "../../auth/models/account.model";
import type { CartItemDocument } from "./cartItem.model";

export const MAX_CART_LINE_ITEMS = 50;
export const MAX_ITEM_QUANTITY = 99;

/** Cart — giỏ hàng, OneToOne với Account; cartItems là OneToMany (phía CartItem giữ ref). */
export interface CartFields extends BaseFields {
  account: Types.ObjectId | AccountDocument;
  totalAmount: number;
}

export type CartDocument = BaseDocument<CartFields> & {
  cartItems?: CartItemDocument[];
};

const CartSchema = new Schema<CartDocument>(
  {
    account: { type: Schema.Types.ObjectId, ref: "Account" },
    totalAmount: { type: Number, default: 0 },
  },
  { collection: "carts" }
);

applyBaseSchema(CartSchema);

// Unique Index account_id — mỗi user 1 giỏ
CartSchema.index({ account: 1 }, { unique: true, name: "UQ_carts_account_id" });

// OneToMany CartItem
CartSchema.virtual("cartItems", {
  ref: "CartItem",
  localField: "_id",
  foreignField: "cart",
});

export const Cart = model<CartDocument, ModelWithSoftDelete<CartDocument>>("Cart", CartSchema);

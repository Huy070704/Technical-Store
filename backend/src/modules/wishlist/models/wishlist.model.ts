import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { AccountDocument } from "../../auth/models/account.model";
import type { ProductDocument } from "../../product/models/product.model";

/** Wishlist — mỗi bản ghi là 1 sản phẩm trong danh sách yêu thích của 1 account. */
export interface WishlistFields extends BaseFields {
  account: Types.ObjectId | AccountDocument;
  product: Types.ObjectId | ProductDocument;
}

export type WishlistDocument = BaseDocument<WishlistFields>;

const WishlistSchema = new Schema<WishlistDocument>(
  {
    account: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
  },
  { collection: "wishlists" }
);

applyBaseSchema(WishlistSchema);

// Mỗi account chỉ lưu 1 bản ghi / sản phẩm
WishlistSchema.index(
  { account: 1, product: 1 },
  { unique: true, name: "UQ_wishlists_account_product" }
);

export const Wishlist = model<WishlistDocument, ModelWithSoftDelete<WishlistDocument>>(
  "Wishlist",
  WishlistSchema
);

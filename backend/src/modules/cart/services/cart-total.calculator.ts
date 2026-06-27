import { Service } from "typedi";
import { ClientSession } from "mongoose";
import { CartItemDocument } from "../models/cartItem.model";
import { Product, ProductDocument } from "../../product/models/product.model";

@Service()
export class CartTotalCalculator {
  async calculateFromItems(
    items: CartItemDocument[],
    session?: ClientSession
  ): Promise<number> {
    if (!items?.length) {
      return 0;
    }

    let total = 0;

    for (const item of items) {
      const productId =
        (item.product as ProductDocument)?.id ?? (item.product as any)?.toString?.();
      if (!productId) {
        continue;
      }

      const product = await Product.findById(productId).session(session ?? null);

      if (!this.isLineBillable(product, item.quantity)) {
        continue;
      }

      total += Number(product!.price) * item.quantity;
    }

    return Number(total.toFixed(2));
  }

  private isLineBillable(
    product: ProductDocument | null,
    _quantity: number
  ): product is ProductDocument {
    if (!product?.isActive) {
      return false;
    }
    const price = Number(product.price);
    if (!Number.isFinite(price) || price <= 0) {
      return false;
    }
    // Tồn kho nay quản lý ở bảng Inventory (theo facility) — không gate ở bước
    // tính tổng giỏ hàng nữa; kiểm tra tồn thực sự thuộc bước đặt hàng.
    return true;
  }
}

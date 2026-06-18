import { Service } from "typedi";
import { ClientSession } from "mongoose";
import { CartItemDocument } from "../cartItem.model";
import { Product, ProductDocument } from "@/modules/product/product.model";

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
    quantity: number
  ): product is ProductDocument {
    if (!product?.isActive) {
      return false;
    }
    const price = Number(product.price);
    if (!Number.isFinite(price) || price <= 0) {
      return false;
    }
    const stock = product.stock ?? 0;
    if (stock < quantity) {
      return false;
    }
    return true;
  }
}

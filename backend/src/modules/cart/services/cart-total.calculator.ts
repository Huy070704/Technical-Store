import { Service } from "typedi";
import { EntityManager } from "typeorm";
import { CartItem } from "../cartItem.entity";
import { Product } from "@/modules/product/product.entity";

@Service()
export class CartTotalCalculator {
  async calculateFromItems(
    items: CartItem[],
    manager: EntityManager
  ): Promise<number> {
    if (!items?.length) {
      return 0;
    }

    let total = 0;

    for (const item of items) {
      const productId = item.product?.id;
      if (!productId) {
        continue;
      }

      const product = await manager.findOne(Product, {
        where: { id: productId },
      });

      if (!this.isLineBillable(product, item.quantity)) {
        continue;
      }

      total += Number(product!.price) * item.quantity;
    }

    return Number(total.toFixed(2));
  }

  private isLineBillable(
    product: Product | null,
    quantity: number
  ): product is Product {
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

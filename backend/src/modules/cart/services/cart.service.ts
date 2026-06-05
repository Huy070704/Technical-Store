import { Service } from "typedi";
import { EntityManager } from "typeorm";
import { Cart } from "../cart.entity";
import { CartItem } from "../cartItem.entity";
import { Account } from "@/modules/auth/account.entity";
import { Product } from "@/modules/product/product.entity";
import { AddToCartDto } from "../dtos/cart.dto";
import {
  BadRequestException,
  EntityNotFoundException,
} from "@/shared/exceptions/http-exceptions";
import { DbConnection } from "@/database/dbConnection";
import { CartTotalCalculator } from "./cart-total.calculator";
import {
  MAX_CART_LINE_ITEMS,
  MAX_ITEM_QUANTITY,
} from "../constants/cart.constants";

const CART_RELATIONS = [
  "cartItems",
  "cartItems.product",
  "cartItems.product.category",
  "cartItems.product.images",
  "account",
] as const;

@Service()
export class CartService {
  constructor(private readonly totalCalculator: CartTotalCalculator) {}

  /** GET /api/cart/view — trả giỏ rỗng nếu chưa từng tạo (không 404). */
  async viewCart(accountId: string): Promise<Cart> {
    const cart = await this.findCartByAccountId(accountId);
    if (!cart) {
      return this.buildEmptyCartView(accountId);
    }
    return this.recalculateAndSave(cart);
  }

  async addToCart(accountId: string, dto: AddToCartDto): Promise<Cart> {
    return this.runInTransaction(async (manager) => {
      const cart = await this.getOrCreateCart(manager, accountId);
      const product = await this.lockProduct(manager, dto.productId);

      const existing = cart.cartItems?.find(
        (line) => line.product?.id === dto.productId
      );

      const nextQty = existing
        ? existing.quantity + dto.quantity
        : dto.quantity;

      if (!existing && (cart.cartItems?.length ?? 0) >= MAX_CART_LINE_ITEMS) {
        throw new BadRequestException(
          `Giỏ hàng đầy. Tối đa ${MAX_CART_LINE_ITEMS} loại sản phẩm`
        );
      }

      this.assertQuantityWithinStock(nextQty, product);

      if (existing) {
        existing.quantity = nextQty;
        await manager.save(existing);
      } else {
        const line = new CartItem();
        line.quantity = dto.quantity;
        line.cart = cart;
        line.product = product;
        await manager.save(line);
      }

      return this.reloadCart(manager, cart.id);
    });
  }

  async increaseQuantity(
    accountId: string,
    productId: string,
    amount: number
  ): Promise<Cart> {
    return this.changeQuantity(accountId, productId, amount, "increase");
  }

  async decreaseQuantity(
    accountId: string,
    productId: string,
    amount: number
  ): Promise<Cart> {
    return this.changeQuantity(accountId, productId, amount, "decrease");
  }

  async removeItem(accountId: string, productId: string): Promise<Cart> {
    return this.runInTransaction(async (manager) => {
      const cart = await this.requireCart(manager, accountId);
      const line = this.findLine(cart, productId);
      await manager.remove(line);
      return this.reloadCart(manager, cart.id);
    });
  }

  async clearCart(accountId: string): Promise<Cart> {
    return this.runInTransaction(async (manager) => {
      const cart = await manager.findOne(Cart, {
        where: { account: { id: accountId } },
        relations: [...CART_RELATIONS],
      });
      if (!cart) {
        return this.buildEmptyCartView(accountId);
      }
      if (cart.cartItems?.length) {
        await manager.remove(cart.cartItems);
      }
      cart.totalAmount = 0;
      await manager.save(cart);
      return this.reloadCart(manager, cart.id);
    });
  }

  /** POST /api/cart/merge-guest — body: { lines: [{ productId, quantity }] } */
  async mergeGuestLines(
    accountId: string,
    lines: { productId: string; quantity: number }[]
  ): Promise<Cart> {
    for (const line of lines) {
      if (line.quantity > 0 && line.quantity <= MAX_ITEM_QUANTITY) {
        await this.addToCart(accountId, {
          productId: line.productId,
          quantity: line.quantity,
        });
      }
    }
    return this.viewCart(accountId);
  }

  private async changeQuantity(
    accountId: string,
    productId: string,
    amount: number,
    mode: "increase" | "decrease"
  ): Promise<Cart> {
    if (amount < 1 || amount > MAX_ITEM_QUANTITY) {
      throw new BadRequestException("Số lượng thay đổi không hợp lệ");
    }

    return this.runInTransaction(async (manager) => {
      const cart = await this.requireCart(manager, accountId);
      const line = this.findLine(cart, productId);

      if (mode === "increase") {
        const product = await this.lockProduct(manager, productId);
        const nextQty = line.quantity + amount;
        this.assertQuantityWithinStock(nextQty, product);
        line.quantity = nextQty;
        await manager.save(line);
      } else {
        if (line.quantity < amount) {
          throw new BadRequestException(
            `Không thể giảm ${amount}. Hiện có ${line.quantity} trong giỏ`
          );
        }
        line.quantity -= amount;
        if (line.quantity <= 0) {
          await manager.remove(line);
        } else {
          await manager.save(line);
        }
      }

      return this.reloadCart(manager, cart.id);
    });
  }

  private async runInTransaction<T>(
    work: (manager: EntityManager) => Promise<T>
  ): Promise<T> {
    const dataSource = DbConnection.appDataSource;
    if (!dataSource?.isInitialized) {
      throw new Error("Database connection not available");
    }
    return dataSource.transaction(work);
  }

  private async findCartByAccountId(accountId: string): Promise<Cart | null> {
    return Cart.findOne({
      where: { account: { id: accountId } },
      relations: [...CART_RELATIONS],
    });
  }

  private async getOrCreateCart(
    manager: EntityManager,
    accountId: string
  ): Promise<Cart> {
    let cart = await manager.findOne(Cart, {
      where: { account: { id: accountId } },
      relations: [...CART_RELATIONS],
    });

    if (cart) {
      return cart;
    }

    const account = await manager.findOne(Account, {
      where: { id: accountId },
    });
    if (!account) {
      throw new EntityNotFoundException("Account");
    }

    cart = new Cart();
    cart.account = account;
    cart.totalAmount = 0;
    return manager.save(cart);
  }

  private async requireCart(
    manager: EntityManager,
    accountId: string
  ): Promise<Cart> {
    const cart = await manager.findOne(Cart, {
      where: { account: { id: accountId } },
      relations: [...CART_RELATIONS],
    });
    if (!cart) {
      throw new EntityNotFoundException("Cart");
    }
    return cart;
  }

  private async reloadCart(
    manager: EntityManager,
    cartId: string
  ): Promise<Cart> {
    const cart = await manager.findOne(Cart, {
      where: { id: cartId },
      relations: [...CART_RELATIONS],
    });
    if (!cart) {
      throw new Error("Failed to reload cart");
    }

    cart.totalAmount = await this.totalCalculator.calculateFromItems(
      cart.cartItems ?? [],
      manager
    );
    await manager.save(cart);
    return cart;
  }

  private async recalculateAndSave(cart: Cart): Promise<Cart> {
    return this.runInTransaction(async (manager) =>
      this.reloadCart(manager, cart.id)
    );
  }

  private async lockProduct(
    manager: EntityManager,
    productId: string
  ): Promise<Product> {
    const product = await manager
      .createQueryBuilder(Product, "product")
      .setLock("pessimistic_write")
      .where("product.id = :id", { id: productId })
      .getOne();

    if (!product) {
      throw new EntityNotFoundException("Product");
    }
    if (!product.isActive) {
      throw new BadRequestException("Sản phẩm hiện không khả dụng");
    }
    return product;
  }

  private findLine(cart: Cart, productId: string): CartItem {
    const line = cart.cartItems?.find((item) => item.product?.id === productId);
    if (!line) {
      throw new BadRequestException("Sản phẩm không có trong giỏ hàng");
    }
    return line;
  }

  private assertQuantityWithinStock(quantity: number, product: Product): void {
    if (quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
      throw new BadRequestException(
        `Số lượng phải từ 1 đến ${MAX_ITEM_QUANTITY}`
      );
    }
    const stock = product.stock ?? 0;
    if (quantity > stock) {
      throw new BadRequestException(
        `Số lượng (${quantity}) vượt tồn kho (${stock})`
      );
    }
  }

  private buildEmptyCartView(accountId: string): Cart {
    const cart = new Cart();
    cart.id = "";
    cart.totalAmount = 0;
    cart.cartItems = [];
    cart.account = { id: accountId } as Account;
    return cart;
  }
}

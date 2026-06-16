import { Service } from "typedi";
import { ClientSession } from "mongoose";
import { Cart, CartDocument } from "../cart.entity";
import { CartItem, CartItemDocument } from "../cartItem.entity";
import { Account } from "@/modules/auth/account.entity";
import { Product, ProductDocument } from "@/modules/product/product.entity";
import { AddToCartDto } from "../dtos/cart.dto";
import {
  BadRequestException,
  EntityNotFoundException,
} from "@/shared/exceptions/http-exceptions";
import { runInTransaction } from "@/shared/mongoose/transaction";
import { CartTotalCalculator } from "./cart-total.calculator";
import {
  MAX_CART_LINE_ITEMS,
  MAX_ITEM_QUANTITY,
} from "../constants/cart.constants";

/** Populate: cartItems → product → category/images, + account. */
const CART_POPULATE = [
  {
    path: "cartItems",
    populate: {
      path: "product",
      populate: [{ path: "category" }, { path: "images" }],
    },
  },
  { path: "account" },
] as const;

@Service()
export class CartService {
  constructor(private readonly totalCalculator: CartTotalCalculator) {}

  /** GET /api/cart/view — trả giỏ rỗng nếu chưa từng tạo (không 404). */
  async viewCart(accountId: string): Promise<CartDocument | any> {
    const cart = await this.findCartByAccountId(accountId);
    if (!cart) {
      return this.buildEmptyCartView(accountId);
    }
    return this.recalculateAndSave(cart);
  }

  async addToCart(accountId: string, dto: AddToCartDto): Promise<CartDocument | any> {
    return runInTransaction(async (session) => {
      const cart = await this.getOrCreateCart(session, accountId);
      const product = await this.lockProduct(session, dto.productId);

      const existing = cart.cartItems?.find(
        (line) => (line.product as ProductDocument)?.id === dto.productId
      );

      const nextQty = existing ? existing.quantity + dto.quantity : dto.quantity;

      if (!existing && (cart.cartItems?.length ?? 0) >= MAX_CART_LINE_ITEMS) {
        throw new BadRequestException(
          `Giỏ hàng đầy. Tối đa ${MAX_CART_LINE_ITEMS} loại sản phẩm`
        );
      }

      this.assertQuantityWithinStock(nextQty, product);

      if (existing) {
        existing.quantity = nextQty;
        await existing.save({ session: session ?? undefined });
      } else {
        const line = new CartItem();
        line.quantity = dto.quantity;
        line.cart = cart._id;
        line.product = product._id;
        await line.save({ session: session ?? undefined });
      }

      return this.reloadCart(session, cart._id.toString());
    });
  }

  async increaseQuantity(accountId: string, productId: string, amount: number): Promise<CartDocument | any> {
    return this.changeQuantity(accountId, productId, amount, "increase");
  }

  async decreaseQuantity(accountId: string, productId: string, amount: number): Promise<CartDocument | any> {
    return this.changeQuantity(accountId, productId, amount, "decrease");
  }

  async removeItem(accountId: string, productId: string): Promise<CartDocument | any> {
    return runInTransaction(async (session) => {
      const cart = await this.requireCart(session, accountId);
      const line = this.findLine(cart, productId);
      await CartItem.deleteOne({ _id: line._id }, { session: session ?? undefined });
      return this.reloadCart(session, cart._id.toString());
    });
  }

  async clearCart(accountId: string): Promise<CartDocument | any> {
    return runInTransaction(async (session) => {
      const cart = await Cart.findOne({ account: accountId })
        .populate(CART_POPULATE as any)
        .session(session ?? null);
      if (!cart) {
        return this.buildEmptyCartView(accountId);
      }
      if (cart.cartItems?.length) {
        await CartItem.deleteMany({ cart: cart._id }, { session: session ?? undefined });
      }
      cart.totalAmount = 0;
      await cart.save({ session: session ?? undefined });
      return this.reloadCart(session, cart._id.toString());
    });
  }

  /** POST /api/cart/merge-guest — body: { lines: [{ productId, quantity }] } */
  async mergeGuestLines(
    accountId: string,
    lines: { productId: string; quantity: number }[]
  ): Promise<CartDocument | any> {
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
  ): Promise<CartDocument | any> {
    if (amount < 1 || amount > MAX_ITEM_QUANTITY) {
      throw new BadRequestException("Số lượng thay đổi không hợp lệ");
    }

    return runInTransaction(async (session) => {
      const cart = await this.requireCart(session, accountId);
      const line = this.findLine(cart, productId);

      if (mode === "increase") {
        const product = await this.lockProduct(session, productId);
        const nextQty = line.quantity + amount;
        this.assertQuantityWithinStock(nextQty, product);
        line.quantity = nextQty;
        await line.save({ session: session ?? undefined });
      } else {
        if (line.quantity < amount) {
          throw new BadRequestException(
            `Không thể giảm ${amount}. Hiện có ${line.quantity} trong giỏ`
          );
        }
        line.quantity -= amount;
        if (line.quantity <= 0) {
          await CartItem.deleteOne({ _id: line._id }, { session: session ?? undefined });
        } else {
          await line.save({ session: session ?? undefined });
        }
      }

      return this.reloadCart(session, cart._id.toString());
    });
  }

  private async findCartByAccountId(accountId: string): Promise<CartDocument | null> {
    return Cart.findOne({ account: accountId }).populate(CART_POPULATE as any);
  }

  private async getOrCreateCart(
    session: ClientSession | undefined,
    accountId: string
  ): Promise<CartDocument> {
    let cart = await Cart.findOne({ account: accountId })
      .populate(CART_POPULATE as any)
      .session(session ?? null);

    if (cart) {
      return cart;
    }

    const account = await Account.findById(accountId).session(session ?? null);
    if (!account) {
      throw new EntityNotFoundException("Account");
    }

    cart = new Cart();
    cart.account = account._id;
    cart.totalAmount = 0;
    await cart.save({ session: session ?? undefined });
    return cart;
  }

  private async requireCart(
    session: ClientSession | undefined,
    accountId: string
  ): Promise<CartDocument> {
    const cart = await Cart.findOne({ account: accountId })
      .populate(CART_POPULATE as any)
      .session(session ?? null);
    if (!cart) {
      throw new EntityNotFoundException("Cart");
    }
    return cart;
  }

  private async reloadCart(
    session: ClientSession | undefined,
    cartId: string
  ): Promise<CartDocument> {
    const cart = await Cart.findById(cartId)
      .populate(CART_POPULATE as any)
      .session(session ?? null);
    if (!cart) {
      throw new Error("Failed to reload cart");
    }

    cart.totalAmount = await this.totalCalculator.calculateFromItems(
      cart.cartItems ?? [],
      session
    );
    await cart.save({ session: session ?? undefined });
    return cart;
  }

  private async recalculateAndSave(cart: CartDocument): Promise<CartDocument> {
    return runInTransaction(async (session) =>
      this.reloadCart(session, cart._id.toString())
    );
  }

  private async lockProduct(
    session: ClientSession | undefined,
    productId: string
  ): Promise<ProductDocument> {
    // MongoDB không có pessimistic row-lock; trong transaction
    // (replica set) đã đảm bảo isolation. Standalone thì best-effort.
    const product = await Product.findById(productId).session(session ?? null);

    if (!product) {
      throw new EntityNotFoundException("Product");
    }
    if (!product.isActive) {
      throw new BadRequestException("Sản phẩm hiện không khả dụng");
    }
    return product;
  }

  private findLine(cart: CartDocument, productId: string): CartItemDocument {
    const line = cart.cartItems?.find(
      (item) => (item.product as ProductDocument)?.id === productId
    );
    if (!line) {
      throw new BadRequestException("Sản phẩm không có trong giỏ hàng");
    }
    return line;
  }

  private assertQuantityWithinStock(quantity: number, product: ProductDocument): void {
    if (quantity < 1 || quantity > MAX_ITEM_QUANTITY) {
      throw new BadRequestException(`Số lượng phải từ 1 đến ${MAX_ITEM_QUANTITY}`);
    }
    const stock = product.stock ?? 0;
    if (quantity > stock) {
      throw new BadRequestException(`Số lượng (${quantity}) vượt tồn kho (${stock})`);
    }
  }

  private buildEmptyCartView(accountId: string): any {
    return {
      id: "",
      totalAmount: 0,
      cartItems: [],
      account: { id: accountId },
    };
  }
}

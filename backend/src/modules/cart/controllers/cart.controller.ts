import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseBefore,
} from "routing-controllers";
import { Service } from "typedi";
import { CartService } from "../services/cart.service";
import { parseBody } from "@/shared/validators/parse-body";
import { Auth } from "@/middlewares/auth.middleware";
import { AccountDetailsDto } from "@/modules/auth/account.types";
import { z } from "zod";

const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ");

const addToCartSchema = z.object({
  productId: mongoId,
  quantity: z.number().int().min(1).max(99),
});

const changeCartQuantitySchema = z.object({
  productId: mongoId,
  amount: z.number().int().min(1),
});

const removeCartItemSchema = z.object({
  productId: mongoId,
});

const guestCartLineSchema = z.object({
  productId: mongoId,
  quantity: z.number().int().min(1).max(99),
});

const mergeGuestCartSchema = z.object({
  lines: z.array(guestCartLineSchema).optional(),
});

interface RequestWithUser extends Express.Request {
  user?: AccountDetailsDto;
}

/**
 * Giỏ hàng (yêu cầu đăng nhập).
 * Response được bọc bởi ResponseInterceptor: { success, statusCode, data }.
 *
 * - GET    /api/cart/view
 * - POST   /api/cart/add          body: { productId, quantity }
 * - POST   /api/cart/increase     body: { productId, amount }
 * - POST   /api/cart/decrease     body: { productId, amount }
 * - PATCH  /api/cart/remove       body: { productId }
 * - POST   /api/cart/clear
 * - POST   /api/cart/merge-guest  body: { lines: [{ productId, quantity }] }
 */
@Service()
@Controller("/cart")
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get("/view")
  @UseBefore(Auth)
  async viewCart(@Req() req: RequestWithUser) {
    return this.cartService.viewCart(req.user!.accountId);
  }

  @Post("/add")
  @UseBefore(Auth)
  async addToCart(@Req() req: RequestWithUser, @Body({ validate: false }) body: unknown) {
    const dto = parseBody(addToCartSchema, body);
    return this.cartService.addToCart(req.user!.accountId, dto);
  }

  @Post("/increase")
  @UseBefore(Auth)
  async increase(
    @Req() req: RequestWithUser,
    @Body({ validate: false }) body: unknown
  ) {
    const dto = parseBody(changeCartQuantitySchema, body);
    return this.cartService.increaseQuantity(
      req.user!.accountId,
      dto.productId,
      dto.amount
    );
  }

  @Post("/decrease")
  @UseBefore(Auth)
  async decrease(
    @Req() req: RequestWithUser,
    @Body({ validate: false }) body: unknown
  ) {
    const dto = parseBody(changeCartQuantitySchema, body);
    return this.cartService.decreaseQuantity(
      req.user!.accountId,
      dto.productId,
      dto.amount
    );
  }

  @Patch("/remove")
  @UseBefore(Auth)
  async remove(@Req() req: RequestWithUser, @Body({ validate: false }) body: unknown) {
    const dto = parseBody(removeCartItemSchema, body);
    return this.cartService.removeItem(req.user!.accountId, dto.productId);
  }

  @Post("/clear")
  @UseBefore(Auth)
  async clear(@Req() req: RequestWithUser) {
    return this.cartService.clearCart(req.user!.accountId);
  }

  @Post("/merge-guest")
  @UseBefore(Auth)
  async mergeGuest(
    @Req() req: RequestWithUser,
    @Body({ validate: false }) body: unknown
  ) {
    const dto = parseBody(mergeGuestCartSchema, body);
    return this.cartService.mergeGuestLines(
      req.user!.accountId,
      dto.lines ?? []
    );
  }
}

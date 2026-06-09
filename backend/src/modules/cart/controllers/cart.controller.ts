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
import {
  AddToCartDto,
  ChangeCartQuantityDto,
  MergeGuestCartDto,
  RemoveCartItemDto,
} from "../dtos/cart.dto";
import { Auth } from "@/middlewares/auth.middleware";
import { AccountDetailsDto } from "@/modules/auth/dtos/account.dto";

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
  async addToCart(@Req() req: RequestWithUser, @Body() body: AddToCartDto) {
    return this.cartService.addToCart(req.user!.accountId, body);
  }

  @Post("/increase")
  @UseBefore(Auth)
  async increase(
    @Req() req: RequestWithUser,
    @Body() body: ChangeCartQuantityDto
  ) {
    return this.cartService.increaseQuantity(
      req.user!.accountId,
      body.productId,
      body.amount
    );
  }

  @Post("/decrease")
  @UseBefore(Auth)
  async decrease(
    @Req() req: RequestWithUser,
    @Body() body: ChangeCartQuantityDto
  ) {
    return this.cartService.decreaseQuantity(
      req.user!.accountId,
      body.productId,
      body.amount
    );
  }

  @Patch("/remove")
  @UseBefore(Auth)
  async remove(@Req() req: RequestWithUser, @Body() body: RemoveCartItemDto) {
    return this.cartService.removeItem(req.user!.accountId, body.productId);
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
    @Body() body: MergeGuestCartDto
  ) {
    return this.cartService.mergeGuestLines(
      req.user!.accountId,
      body.lines ?? []
    );
  }
}

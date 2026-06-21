import { Body, Controller, Get, Post, Req, UseBefore } from "routing-controllers";
import { Service } from "typedi";
import { WishlistService } from "../services/wishlist.service";
import { parseBody } from "@/shared/validators/parse-body";
import { Auth } from "@/middlewares/auth.middleware";
import { AccountDetailsDto } from "@/modules/auth/account.types";
import { z } from "zod";

const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ");

const toggleSchema = z.object({ productId: mongoId });
const mergeSchema = z.object({ productIds: z.array(mongoId).optional() });

interface RequestWithUser extends Express.Request {
  user?: AccountDetailsDto;
}

/**
 * Wishlist (yêu cầu đăng nhập).
 * Response được bọc bởi ResponseInterceptor: { success, statusCode, data }.
 *
 * - GET    /api/wishlist/view                       → { productIds }
 * - POST   /api/wishlist/toggle      body: { productId }            → { added, productIds }
 * - POST   /api/wishlist/clear                      → { productIds: [] }
 * - POST   /api/wishlist/merge-guest body: { productIds: string[] } → { productIds }
 */
@Service()
@Controller("/wishlist")
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get("/view")
  @UseBefore(Auth)
  async view(@Req() req: RequestWithUser) {
    const productIds = await this.wishlistService.getProductIds(req.user!.accountId);
    return { productIds };
  }

  @Post("/toggle")
  @UseBefore(Auth)
  async toggle(@Req() req: RequestWithUser, @Body({ validate: false }) body: unknown) {
    const dto = parseBody(toggleSchema, body);
    return this.wishlistService.toggle(req.user!.accountId, dto.productId);
  }

  @Post("/clear")
  @UseBefore(Auth)
  async clear(@Req() req: RequestWithUser) {
    return this.wishlistService.clear(req.user!.accountId);
  }

  @Post("/merge-guest")
  @UseBefore(Auth)
  async mergeGuest(@Req() req: RequestWithUser, @Body({ validate: false }) body: unknown) {
    const dto = parseBody(mergeSchema, body);
    return this.wishlistService.merge(req.user!.accountId, dto.productIds ?? []);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  QueryParam,
  Req,
  UseBefore,
} from "routing-controllers";
import { Service } from "typedi";
import { OrderService } from "../services/order.service";
import {
  createOrderSchema,
  updateOrderSchema,
  createInStoreOrderSchema,
  collectPaymentSchema,
  parseBody,
} from "../schemas/order.schemas";
import { Auth } from "@/middlewares/auth.middleware";
import { AccountDetailsDto, RolePayload } from "@/modules/auth/account.types";
import { JwtService } from "@/modules/auth/services/jwt.service";
import { BadRequestException, ForbiddenException } from "@/shared/exceptions/http-exceptions";
import { z } from "zod";

const guestOrderLookupSchema = z.object({
  orderId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Mã đơn hàng không hợp lệ"),
  email: z.string().email("Email không hợp lệ"),
});

const STAFF_SLUGS = ["admin", "manager", "staff"];

function isStaff(role: RolePayload | undefined): boolean {
  if (!role) return false;
  return (
    STAFF_SLUGS.includes(role.slug ?? "") ||
    STAFF_SLUGS.includes(role.name ?? "")
  );
}

interface RequestWithUser {
  user?: AccountDetailsDto;
  headers: Record<string, string | string[] | undefined>;
}

@Service()
@Controller("/orders")
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly jwtService: JwtService
  ) {}

  // ─── Guest: tra cứu đơn hàng (không cần auth) ────────────────────────────

  @Get("/guest")
  async getGuestOrder(
    @QueryParam("orderId") orderId: string,
    @QueryParam("email") email: string
  ) {
    const dto = parseBody(guestOrderLookupSchema, { orderId, email });
    const order = await this.orderService.getGuestOrder(dto.orderId, dto.email);
    return { message: "Lấy đơn hàng thành công", order };
  }

  // ─── Customer: create order ──────────────────────────────────────────────

  @Post()
  async createOrder(
    @Req() req: RequestWithUser,
    @Body({ validate: false }) body: unknown
  ) {
    const dto = parseBody(createOrderSchema, body);

    if (dto.isGuest) {
      const order = await this.orderService.createGuestOrder(dto);
      return { message: "Đặt hàng khách thành công", order };
    }

    const accountId = this.extractAccountId(req);
    if (!accountId) {
      throw new ForbiddenException(
        "Vui lòng đăng nhập hoặc chọn đặt hàng khách (isGuest)"
      );
    }

    const order = await this.orderService.createOrder(accountId, dto);
    return { message: "Đặt hàng thành công", order };
  }

  // ─── Staff: in-store sale ────────────────────────────────────────────────

  @Post("/instore")
  @UseBefore(Auth)
  async createInStoreOrder(
    @Req() req: RequestWithUser,
    @Body({ validate: false }) body: unknown
  ) {
    if (!isStaff(req.user?.role)) {
      throw new ForbiddenException("Chỉ nhân viên mới có thể thực hiện bán hàng tại quầy");
    }
    const dto = parseBody(createInStoreOrderSchema, body);
    const order = await this.orderService.createInStoreOrder(dto);
    return { message: "Tạo đơn hàng tại quầy thành công", order };
  }

  // ─── Role-aware: list orders ─────────────────────────────────────────────

  @Get()
  @UseBefore(Auth)
  async getOrders(
    @Req() req: RequestWithUser,
    @QueryParam("page") page = 1,
    @QueryParam("limit") limit = 20,
    @QueryParam("status") status?: string
  ) {
    const user = req.user!;

    if (isStaff(user.role)) {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
      const result = await this.orderService.getOrders(pageNum, limitNum, status);
      return {
        message: "Lấy danh sách đơn hàng thành công",
        data: result.data,
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    }

    const pageNum = Math.max(1, Math.min(1000, Number(page) || 1));
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));
    const result = await this.orderService.getOrdersByCustomer(
      user.accountId,
      pageNum,
      limitNum,
      status
    );
    return {
      message: "Lấy danh sách đơn hàng thành công",
      orders: result.orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.total,
        totalPages: Math.ceil(result.total / limitNum),
      },
    };
  }

  // ─── Customer: statistics ────────────────────────────────────────────────

  @Get("/statistics")
  @UseBefore(Auth)
  async getStatistics(@Req() req: RequestWithUser) {
    const user = req.user!;
    const statistics = await this.orderService.getOrderStatistics(user.accountId);
    return { message: "Lấy thống kê đơn hàng thành công", statistics };
  }

  // ─── Role-aware: get single order ────────────────────────────────────────

  @Get("/:id")
  @UseBefore(Auth)
  async getOrder(@Param("id") id: string, @Req() req: RequestWithUser) {
    const user = req.user!;
    const accountId = isStaff(user.role) ? undefined : user.accountId;
    const order = await this.orderService.getOrderById(id, accountId);
    return { message: "Lấy đơn hàng thành công", order };
  }

  // ─── Customer: update status / confirm receipt ───────────────────────────

  @Patch("/:id/status")
  @UseBefore(Auth)
  async updateStatus(
    @Param("id") id: string,
    @Body({ validate: false }) body: unknown,
    @Req() req: RequestWithUser
  ) {
    const user = req.user!;
    const dto = parseBody(updateOrderSchema, body);
    const order = await this.orderService.updateOrderStatus(id, user.accountId, dto);
    return { message: "Cập nhật trạng thái đơn hàng thành công", order };
  }

  @Post("/:id/confirm-delivery")
  @UseBefore(Auth)
  async confirmDelivery(
    @Param("id") id: string,
    @Req() req: RequestWithUser
  ) {
    const user = req.user!;
    const order = await this.orderService.confirmDelivery(id, user.accountId);
    return { message: "Xác nhận đã nhận hàng thành công", order };
  }

  // ─── Staff: order management ─────────────────────────────────────────────

  @Patch("/:id/confirm")
  @UseBefore(Auth)
  async confirmOrder(@Req() req: RequestWithUser, @Param("id") id: string) {
    if (!isStaff(req.user?.role)) {
      throw new ForbiddenException("Không có quyền thực hiện thao tác này");
    }
    const order = await this.orderService.confirmOrder(id);
    return { message: "Xác nhận đơn hàng thành công", order };
  }

  @Patch("/:id/collect-payment")
  @UseBefore(Auth)
  async collectPayment(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body({ validate: false }) body: unknown
  ) {
    if (!isStaff(req.user?.role)) {
      throw new ForbiddenException("Không có quyền thực hiện thao tác này");
    }
    const dto = parseBody(collectPaymentSchema, body);
    const order = await this.orderService.collectPayment(id, dto.amount, dto.method);
    return { message: "Ghi nhận thanh toán thành công", order };
  }

  @Patch("/:id/deliver")
  @UseBefore(Auth)
  async staffConfirmDelivery(@Req() req: RequestWithUser, @Param("id") id: string) {
    if (!isStaff(req.user?.role)) {
      throw new ForbiddenException("Không có quyền thực hiện thao tác này");
    }
    const order = await this.orderService.staffConfirmDelivery(id);
    return { message: "Xác nhận giao hàng thành công", order };
  }

  @Patch("/:id/ship")
  @UseBefore(Auth)
  async markShipping(@Req() req: RequestWithUser, @Param("id") id: string) {
    if (!isStaff(req.user?.role)) {
      throw new ForbiddenException("Không có quyền thực hiện thao tác này");
    }
    const order = await this.orderService.markOrderShipping(id);
    return { message: "Đã bàn giao shipper, đơn hàng đang giao", order };
  }

  @Patch("/:id/delivery-failed")
  @UseBefore(Auth)
  async markDeliveryFailed(@Req() req: RequestWithUser, @Param("id") id: string) {
    if (!isStaff(req.user?.role)) {
      throw new ForbiddenException("Không có quyền thực hiện thao tác này");
    }
    const order = await this.orderService.markDeliveryFailed(id);
    return { message: "Đã đánh dấu giao hàng thất bại", order };
  }

  @Patch("/:id/redeliver")
  @UseBefore(Auth)
  async redeliverOrder(@Req() req: RequestWithUser, @Param("id") id: string) {
    if (!isStaff(req.user?.role)) {
      throw new ForbiddenException("Không có quyền thực hiện thao tác này");
    }
    const order = await this.orderService.redeliverOrder(id);
    return { message: "Đã giao lại đơn hàng", order };
  }

  @Patch("/:id/cancel")
  @UseBefore(Auth)
  async staffCancelOrder(
    @Req() req: RequestWithUser,
    @Param("id") id: string,
    @Body({ validate: false }) body: unknown
  ) {
    if (!isStaff(req.user?.role)) {
      throw new ForbiddenException("Không có quyền thực hiện thao tác này");
    }
    const schema = z.object({
      cancelReason: z.string().min(1, "Vui lòng nhập lý do hủy"),
    });
    const dto = parseBody(schema, body);
    const order = await this.orderService.staffCancelOrder(id, dto.cancelReason);
    return { message: "Hủy đơn hàng thành công", order };
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private extractAccountId(req: RequestWithUser): string | null {
    const authHeader = req.headers?.authorization as string | undefined;
    if (!authHeader?.startsWith("Bearer ")) return null;
    try {
      const token = authHeader.substring(7);
      const decoded = this.jwtService.verifyAccessToken(token) as AccountDetailsDto | null;
      return decoded?.accountId ?? null;
    } catch {
      return null;
    }
  }
}

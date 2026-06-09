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
import { CreateOrderDto } from "../dtos/create-order.dto";
import { UpdateOrderDto } from "../dtos/update-order.dto";
import { Auth } from "@/middlewares/auth.middleware";
import { AccountDetailsDto } from "@/modules/auth/dtos/account.dto";
import { JwtService } from "@/modules/auth/services/jwt.service";
import { BadRequestException } from "@/shared/exceptions/http-exceptions";

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

  @Post()
  async createOrder(
    @Req() req: RequestWithUser,
    @Body() dto: CreateOrderDto
  ) {
    if (dto.isGuest) {
      const order = await this.orderService.createGuestOrder(dto);
      return {
        message: "Đặt hàng khách thành công",
        order,
      };
    }

    const accountId = this.extractAccountId(req);
    if (!accountId) {
      throw new BadRequestException(
        "Vui lòng đăng nhập hoặc chọn đặt hàng khách (isGuest)"
      );
    }

    const order = await this.orderService.createOrder(accountId, dto);
    return {
      message: "Đặt hàng thành công",
      order,
    };
  }

  @Get()
  @UseBefore(Auth)
  async getOrders(
    @Req() req: RequestWithUser,
    @QueryParam("page") page = 1,
    @QueryParam("limit") limit = 20
  ) {
    const user = req.user!;
    const pageNum = Math.max(1, Math.min(1000, Number(page) || 1));
    const limitNum = Math.max(1, Math.min(100, Number(limit) || 20));

    const result = await this.orderService.getOrdersByCustomer(
      user.accountId,
      pageNum,
      limitNum
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

  @Get("/statistics")
  @UseBefore(Auth)
  async getStatistics(@Req() req: RequestWithUser) {
    const user = req.user!;
    const statistics = await this.orderService.getOrderStatistics(
      user.accountId
    );
    return {
      message: "Lấy thống kê đơn hàng thành công",
      statistics,
    };
  }

  @Get("/:id")
  @UseBefore(Auth)
  async getOrder(@Param("id") id: string, @Req() req: RequestWithUser) {
    const user = req.user!;
    const order = await this.orderService.getOrderById(id, user.accountId);
    return {
      message: "Lấy đơn hàng thành công",
      order,
    };
  }

  @Patch("/:id/status")
  @UseBefore(Auth)
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateOrderDto,
    @Req() req: RequestWithUser
  ) {
    const user = req.user!;
    const order = await this.orderService.updateOrderStatus(
      id,
      user.accountId,
      dto
    );
    return {
      message: "Cập nhật trạng thái đơn hàng thành công",
      order,
    };
  }

  @Post("/:id/confirm-delivery")
  @UseBefore(Auth)
  async confirmDelivery(
    @Param("id") id: string,
    @Req() req: RequestWithUser
  ) {
    const user = req.user!;
    const order = await this.orderService.confirmDelivery(
      id,
      user.accountId
    );
    return {
      message: "Xác nhận đã nhận hàng thành công",
      order,
    };
  }

  private extractAccountId(req: RequestWithUser): string | null {
    const authHeader = req.headers?.authorization as string | undefined;
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }
    try {
      const token = authHeader.substring(7);
      const decoded = this.jwtService.verifyAccessToken(token) as AccountDetailsDto | null;
      return decoded?.accountId ?? null;
    } catch {
      return null;
    }
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  QueryParam,
  Req,
  UseBefore,
} from 'routing-controllers';
import { Service } from 'typedi';
import { OrderService } from './order.service';
import { Auth } from '@/middlewares/auth.middleware';
import { CheckAbility } from '@/middlewares/rbac/permission.decorator';
import { Order } from './order.entity';
import type { CollectPaymentDto } from './dtos/order.dto';

@Service()
@Controller('/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('/')
  @UseBefore(Auth)
  @CheckAbility('read', Order)
  async getOrders(
    @Req() _req: any,
    @QueryParam('page') page = 1,
    @QueryParam('limit') limit = 20,
    @QueryParam('status') status?: string,
  ) {
    return this.orderService.getOrders(Number(page), Number(limit), status);
  }

  @Get('/:id')
  @UseBefore(Auth)
  @CheckAbility('read', Order)
  async getOrderById(@Req() _req: any, @Param('id') id: string) {
    return this.orderService.getOrderById(id);
  }

  /** Xác nhận đơn hàng: PENDING → PROCESSING */
  @Patch('/:id/confirm')
  @UseBefore(Auth)
  @CheckAbility('update', Order)
  async confirmOrder(@Req() _req: any, @Param('id') id: string) {
    return this.orderService.confirmOrder(id);
  }

  /** Thu tiền còn lại khi giao hàng (SHIPPING) */
  @Patch('/:id/collect-payment')
  @UseBefore(Auth)
  @CheckAbility('update', Order)
  async collectPayment(
    @Req() _req: any,
    @Param('id') id: string,
    @Body() body: CollectPaymentDto,
  ) {
    return this.orderService.collectPayment(id, body.amount, body.method);
  }

  /** Xác nhận giao thành công: SHIPPING → DELIVERED + tạo hóa đơn */
  @Patch('/:id/deliver')
  @UseBefore(Auth)
  @CheckAbility('update', Order)
  async confirmDelivery(@Req() _req: any, @Param('id') id: string) {
    return this.orderService.confirmDelivery(id);
  }
}

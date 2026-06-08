import { Service } from 'typedi';
import { Order, OrderStatus } from './order.entity';
import { Payment } from '@/modules/payment/payment.entity';
import { Invoice, InvoiceStatus } from '@/modules/payment/invoice.entity';
import {
  BadRequestException,
  EntityNotFoundException,
} from '@/shared/exceptions/http-exceptions';
import type {
  OrderDetailDto,
  OrderItemDto,
  OrderListItemDto,
} from './dtos/order.dto';

@Service()
export class OrderService {
  // ─── helpers ───────────────────────────────────────────────────────────────

  private toListItem(order: Order): OrderListItemDto {
    const latestPayment = order.payments?.[order.payments.length - 1] ?? null;
    return {
      id: order.id,
      orderDate: order.orderDate,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      paymentMethod: order.paymentMethod ?? null,
      shippingAddress: order.shippingAddress ?? null,
      customer: order.customer
        ? {
            name: order.customer.name ?? '',
            email: order.customer.email,
            phone: order.customer.phone ?? null,
          }
        : null,
      itemCount: order.orderDetails?.length ?? 0,
      latestPaymentStatus: latestPayment?.status ?? null,
    };
  }

  private toDetail(order: Order): OrderDetailDto {
    const items: OrderItemDto[] = (order.orderDetails ?? []).map((d) => ({
      productId: d.product?.id ?? '',
      productName: d.product?.name ?? 'Unknown',
      productImage: (d.product as any)?.images?.[0]?.url ?? null,
      quantity: d.quantity,
      unitPrice: Number(d.price),
      subtotal: Number(d.price) * d.quantity,
    }));

    return {
      ...this.toListItem(order),
      note: order.note ?? null,
      cancelReason: order.cancelReason ?? null,
      requireInvoice: order.requireInvoice,
      shipper: order.shipper
        ? { name: order.shipper.name ?? '', phone: order.shipper.phone ?? null }
        : null,
      items,
      payments: (order.payments ?? []).map((p) => ({
        amount: Number(p.amount),
        status: p.status,
        method: p.method,
      })),
      invoices: (order.invoices ?? []).map((inv) => ({
        invoiceNumber: inv.invoiceNumber ?? null,
        status: inv.status,
        totalAmount: Number(inv.totalAmount),
        paidAt: inv.paidAt ?? null,
      })),
    };
  }

  // ─── public methods ────────────────────────────────────────────────────────

  async getOrders(
    page: number,
    limit: number,
    status?: string,
  ): Promise<{ data: OrderListItemDto[]; total: number; page: number; limit: number }> {
    const qb = Order.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.payments', 'payments')
      .leftJoinAndSelect('order.orderDetails', 'orderDetails')
      .orderBy('order.orderDate', 'DESC');

    if (status) {
      const list = status.split(',').map((s) => s.trim()).filter(Boolean);
      if (list.length === 1) {
        qb.where('order.status = :status', { status: list[0] });
      } else {
        qb.where('order.status IN (:...statuses)', { statuses: list });
      }
    }

    const total = await qb.getCount();
    const orders = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: orders.map((o) => this.toListItem(o)),
      total,
      page,
      limit,
    };
  }

  async confirmOrder(id: string): Promise<OrderDetailDto> {
    const order = await Order.findOne({
      where: { id },
      relations: ['customer', 'shipper', 'payments', 'invoices', 'orderDetails', 'orderDetails.product'],
    });

    if (!order) throw new EntityNotFoundException('Order');

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Chỉ có thể xác nhận đơn hàng ở trạng thái PENDING. Trạng thái hiện tại: ${order.status}`,
      );
    }

    order.status = OrderStatus.PROCESSING;
    await order.save();

    return this.toDetail(order);
  }

  async collectPayment(id: string, amount: number, method: string): Promise<OrderDetailDto> {
    const order = await Order.findOne({
      where: { id },
      relations: ['payments'],
    });

    if (!order) throw new EntityNotFoundException('Order');

    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException('Chỉ có thể thu tiền khi đơn hàng đang ở trạng thái SHIPPING.');
    }

    const totalPaid = (order.payments ?? [])
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(order.totalAmount) - totalPaid;

    if (amount <= 0 || amount > remaining + 0.01) {
      throw new BadRequestException(
        `Số tiền không hợp lệ. Số tiền còn phải thu: ${remaining.toLocaleString('vi-VN')} VND.`,
      );
    }

    const payment = new Payment();
    payment.order = order;
    payment.amount = amount;
    payment.status = 'PAID';
    payment.method = method;
    await payment.save();

    return this.getOrderById(id);
  }

  async confirmDelivery(id: string): Promise<OrderDetailDto> {
    const order = await Order.findOne({
      where: { id },
      relations: ['payments'],
    });

    if (!order) throw new EntityNotFoundException('Order');

    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException('Chỉ có thể xác nhận giao khi đơn đang ở trạng thái SHIPPING.');
    }

    const totalPaid = (order.payments ?? [])
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const isPaid = totalPaid >= Number(order.totalAmount) - 0.01;

    const invoice = new Invoice();
    invoice.order = order;
    invoice.invoiceNumber = `INV-${Date.now()}`;
    invoice.totalAmount = order.totalAmount;
    invoice.status = isPaid ? InvoiceStatus.PAID : InvoiceStatus.UNPAID;
    invoice.paymentMethod = order.paymentMethod ?? null;
    if (isPaid) invoice.paidAt = new Date();
    await invoice.save();

    order.status = OrderStatus.DELIVERED;
    await order.save();

    return this.getOrderById(id);
  }

  async getOrderById(id: string): Promise<OrderDetailDto> {
    const order = await Order.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.shipper', 'shipper')
      .leftJoinAndSelect('order.payments', 'payments')
      .leftJoinAndSelect('order.invoices', 'invoices')
      .leftJoinAndSelect('order.orderDetails', 'orderDetails')
      .leftJoinAndSelect('orderDetails.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .where('order.id = :id', { id })
      .andWhere('order.deletedAt IS NULL')
      .getOne();

    if (!order) throw new EntityNotFoundException('Order');
    return this.toDetail(order);
  }
}

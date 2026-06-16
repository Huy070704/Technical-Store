import { Service } from "typedi";
import { Order, OrderDocument, OrderStatus } from "./order.entity";
import { Payment } from "@/modules/payment/payment.entity";
import { Invoice, InvoiceStatus } from "@/modules/payment/invoice.entity";
import {
  BadRequestException,
  EntityNotFoundException,
} from "@/shared/exceptions/http-exceptions";
import type {
  OrderDetailDto,
  OrderItemDto,
  OrderListItemDto,
} from "./dtos/order.dto";

@Service()
export class OrderService {
  // ─── helpers ───────────────────────────────────────────────────────────────

  private toListItem(order: OrderDocument): OrderListItemDto {
    const payments = (order.payments ?? []) as any[];
    const latestPayment = payments[payments.length - 1] ?? null;
    const customer = order.customer as any;
    return {
      id: order.id,
      orderDate: order.orderDate,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      paymentMethod: order.paymentMethod ?? null,
      shippingAddress: order.shippingAddress ?? null,
      customer: customer
        ? {
            name: customer.name ?? "",
            email: customer.email,
            phone: customer.phone ?? null,
          }
        : null,
      itemCount: order.orderDetails?.length ?? 0,
      latestPaymentStatus: latestPayment?.status ?? null,
    };
  }

  private toDetail(order: OrderDocument): OrderDetailDto {
    const items: OrderItemDto[] = (order.orderDetails ?? []).map((d: any) => ({
      productId: d.product?.id ?? "",
      productName: d.product?.name ?? "Unknown",
      productImage: d.product?.images?.[0]?.url ?? null,
      quantity: d.quantity,
      unitPrice: Number(d.price),
      subtotal: Number(d.price) * d.quantity,
    }));

    const shipper = order.shipper as any;
    return {
      ...this.toListItem(order),
      note: order.note ?? null,
      cancelReason: order.cancelReason ?? null,
      requireInvoice: order.requireInvoice,
      shipper: shipper
        ? { name: shipper.name ?? "", phone: shipper.phone ?? null }
        : null,
      items,
      payments: ((order.payments ?? []) as any[]).map((p) => ({
        amount: Number(p.amount),
        status: p.status,
        method: p.method,
      })),
      invoices: ((order.invoices ?? []) as any[]).map((inv) => ({
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
    status?: string
  ): Promise<{ data: OrderListItemDto[]; total: number; page: number; limit: number }> {
    const filter: any = {};
    if (status) {
      const list = status.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length === 1) {
        filter.status = list[0];
      } else if (list.length > 1) {
        filter.status = { $in: list };
      }
    }

    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate("customer")
      .populate("payments")
      .populate("orderDetails")
      .sort({ orderDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      data: orders.map((o) => this.toListItem(o)),
      total,
      page,
      limit,
    };
  }

  async confirmOrder(id: string): Promise<OrderDetailDto> {
    const order = await Order.findById(id).populate([
      { path: "customer" },
      { path: "shipper" },
      { path: "payments" },
      { path: "invoices" },
      { path: "orderDetails", populate: { path: "product" } },
    ] as any);

    if (!order) throw new EntityNotFoundException("Order");

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Chỉ có thể xác nhận đơn hàng ở trạng thái PENDING. Trạng thái hiện tại: ${order.status}`
      );
    }

    order.status = OrderStatus.PROCESSING;
    await order.save();

    return this.toDetail(order);
  }

  async collectPayment(id: string, amount: number, method: string): Promise<OrderDetailDto> {
    const order = await Order.findById(id).populate("payments");

    if (!order) throw new EntityNotFoundException("Order");

    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException(
        "Chỉ có thể thu tiền khi đơn hàng đang ở trạng thái SHIPPING."
      );
    }

    const totalPaid = ((order.payments ?? []) as any[])
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(order.totalAmount) - totalPaid;

    if (amount <= 0 || amount > remaining + 0.01) {
      throw new BadRequestException(
        `Số tiền không hợp lệ. Số tiền còn phải thu: ${remaining.toLocaleString("vi-VN")} VND.`
      );
    }

    const payment = new Payment();
    payment.order = order._id;
    payment.amount = amount;
    payment.status = "PAID";
    payment.method = method;
    await payment.save();

    return this.getOrderById(id);
  }

  async confirmDelivery(id: string): Promise<OrderDetailDto> {
    const order = await Order.findById(id).populate("payments");

    if (!order) throw new EntityNotFoundException("Order");

    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException(
        "Chỉ có thể xác nhận giao khi đơn đang ở trạng thái SHIPPING."
      );
    }

    const totalPaid = ((order.payments ?? []) as any[])
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const isPaid = totalPaid >= Number(order.totalAmount) - 0.01;

    const invoice = new Invoice();
    invoice.order = order._id;
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
    const order = await Order.findById(id).populate([
      { path: "customer" },
      { path: "shipper" },
      { path: "payments" },
      { path: "invoices" },
      {
        path: "orderDetails",
        populate: { path: "product", populate: { path: "images" } },
      },
    ] as any);

    if (!order) throw new EntityNotFoundException("Order");
    return this.toDetail(order);
  }
}

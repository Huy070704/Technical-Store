import { Service, Container } from "typedi";
import { randomInt } from "crypto";
import { DbConnection } from "@/database/dbConnection";
import { Payment } from "../payment.entity";
import { Order, OrderStatus } from "@/modules/order/order.entity";
import { Invoice, InvoiceStatus } from "../invoice.entity";
import { PaymentStatusDto } from "../dtos/payment.dto";
import {
  payos,
  toPayOsDescription,
  isPayosSignatureBypassEnabled,
} from "@/utils/payos/payos";
import {
  BadRequestException,
  EntityNotFoundException,
  ForbiddenException,
} from "@/shared/exceptions/http-exceptions";
import { isUuidV4 } from "@/shared/validators/uuid";

export interface PayosLinkRequester {
  accountId?: string;
  guestEmail?: string;
}

@Service()
export class PaymentService {
  async getPaymentStatus(
    orderId: string,
    requester?: PayosLinkRequester
  ): Promise<PaymentStatusDto> {
    this.assertValidOrderId(orderId);
    const payment = await this.findPaymentForOrder(orderId, requester);
    return {
      orderId: payment.order.id,
      status: payment.status,
      amount: Number(payment.amount),
      paymentMethod: payment.method,
      transactionId: payment.id,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }

  async createPayosPaymentLink(
    orderId: string,
    requester?: PayosLinkRequester
  ): Promise<string> {
    this.assertValidOrderId(orderId);
    const order = await DbConnection.appDataSource.manager.findOne(Order, {
      where: { id: orderId },
      relations: ["customer", "payments"],
    });

    if (!order) {
      throw new EntityNotFoundException("Order");
    }

    this.assertOrderAccess(order, requester);

    if (order.paymentMethod !== "ONLINE") {
      throw new BadRequestException("Đơn hàng không dùng thanh toán trực tuyến");
    }

    let payment: Payment | null =
      order.payments?.find((p) => p.method === "PAYOS") ?? null;
    if (!payment) {
      payment = await DbConnection.appDataSource.manager.findOne(Payment, {
        where: { order: { id: orderId }, method: "PAYOS" },
      });
    }

    if (payment?.status === "completed") {
      throw new BadRequestException("Đơn hàng đã được thanh toán");
    }

    const orderCode = this.generateUniqueOrderCode();

    if (!payment) {
      payment = new Payment();
      payment.order = order;
      payment.method = "PAYOS";
      payment.status = "pending";
      payment.amount = Number(order.totalAmount);
    }

    payment.payosOrderCode = String(orderCode);
    payment.amount = Number(order.totalAmount);
    payment.status = "pending";
    await payment.save();

    const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
    const returnUrl =
      process.env.PAYOS_RETURN_URL ||
      `${frontendBase}/checkout/result?paymentSuccess=true`;
    const cancelUrl =
      process.env.PAYOS_CANCEL_URL ||
      `${frontendBase}/checkout/result?paymentCancelled=true`;

    const orderRef = order.id.replace(/-/g, "").slice(-6).toUpperCase();

    try {
      const response = await payos.createPaymentLink({
        orderCode,
        amount: Number(order.totalAmount),
        description: toPayOsDescription(`TS DH #${orderRef}`),
        cancelUrl: `${cancelUrl}&orderId=${order.id}`,
        returnUrl: `${returnUrl}&orderId=${order.id}`,
      });
      return response.checkoutUrl;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("PayOS Create Payment Link Error:", err);
      throw new BadRequestException(`Không tạo được link PayOS: ${message}`);
    }
  }

  async handlePayosWebhook(body: Record<string, unknown>): Promise<void> {
    let verifiedData: Record<string, unknown>;

    if (isPayosSignatureBypassEnabled()) {
      console.warn("Bypassing PayOS signature verification (non-production).");
      verifiedData = (body.data as Record<string, unknown>) || body;
    } else {
      verifiedData = payos.verifyPaymentWebhookData(
        body as Parameters<typeof payos.verifyPaymentWebhookData>[0]
      ) as Record<string, unknown>;
    }

    const orderCode = String(verifiedData.orderCode);

    const payment = await DbConnection.appDataSource.manager.findOne(Payment, {
      where: { payosOrderCode: orderCode },
      relations: ["order", "order.invoices"],
    });

    if (!payment) {
      throw new BadRequestException(
        `Payment with PayOS orderCode ${orderCode} not found`
      );
    }

    if (payment.status === "completed") {
      return;
    }

    await DbConnection.appDataSource.manager.transaction(async (manager) => {
      payment.status = "completed";
      await manager.save(payment);

      const order = await manager.findOne(Order, {
        where: { id: payment.order.id },
        relations: ["invoices"],
      });
      if (!order) return;

      order.status = OrderStatus.SHIPPING;
      order.paymentMethod = "PAYOS";
      await manager.save(order);

      const invoice = order.invoices?.[0];
      if (invoice) {
        invoice.status = InvoiceStatus.PAID;
        invoice.paidAt = new Date();
        invoice.paymentMethod = "PAYOS";
        invoice.payment = payment;
        await manager.save(invoice);
      }
    });

    try {
      const order = await DbConnection.appDataSource.manager.findOne(Order, {
        where: { id: payment.order.id },
        relations: ["customer", "orderDetails", "orderDetails.product"],
      });
      if (order) {
        const email = order.customer?.email || this.extractEmailFromNote(order.note);
        if (email) {
          const { MailService } = await import("@/utils/mail/mail.service");
          const mailService = Container.get(MailService);
          await mailService.sendOrderConfirmationMail(email, order);
        }
      }
    } catch (err) {
      console.error("Failed to send order confirmation email in webhook:", err);
    }
  }

  private assertOrderAccess(
    order: Order,
    requester?: PayosLinkRequester
  ): void {
    if (order.customer) {
      if (!requester?.accountId) {
        throw new ForbiddenException("Yêu cầu đăng nhập để thanh toán đơn này");
      }
      if (order.customer.id !== requester.accountId) {
        throw new ForbiddenException("Bạn không có quyền thanh toán đơn này");
      }
      return;
    }

    if (!requester?.guestEmail) {
      throw new BadRequestException(
        "Guest cần cung cấp email khớp với đơn hàng"
      );
    }

    const noteEmail = this.extractEmailFromNote(order.note);
    const normalizedGuest = requester.guestEmail.trim().toLowerCase();
    if (noteEmail && noteEmail !== normalizedGuest) {
      throw new ForbiddenException("Email không khớp với đơn hàng");
    }
  }

  private extractEmailFromNote(note: string): string | null {
    const match = note.match(/Email:\s*([^\s|]+)/i);
    return match ? match[1].trim().toLowerCase() : null;
  }

  private async findPaymentForOrder(
    orderId: string,
    requester?: PayosLinkRequester
  ): Promise<Payment> {
    const order = await DbConnection.appDataSource.manager.findOne(Order, {
      where: { id: orderId },
      relations: ["customer"],
    });
    if (!order) {
      throw new EntityNotFoundException("Order");
    }
    this.assertOrderAccess(order, requester);

    const payment = await DbConnection.appDataSource.manager.findOne(Payment, {
      where: { order: { id: orderId } },
      relations: ["order"],
    });
    if (!payment) {
      throw new EntityNotFoundException("Payment");
    }
    return payment;
  }

  private generateUniqueOrderCode(): number {
    const ts = Math.floor(Date.now() / 1000);
    const rand = randomInt(1000, 9999);
    return ts * 10000 + rand;
  }

  private assertValidOrderId(orderId: string): void {
    if (!isUuidV4(orderId)) {
      throw new BadRequestException("Mã đơn hàng không hợp lệ");
    }
  }
}

import { Service, Container } from "typedi";
import { randomInt } from "crypto";
import { Payment, PaymentDocument } from "../payment.model";
import { Order, OrderDocument, OrderStatus } from "@/modules/order/order.model";
import { Invoice, InvoiceStatus } from "../invoice.model";

export interface PaymentStatusDto {
  orderId: string;
  status: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  createdAt: Date;
  updatedAt: Date;
}
import {
  payos,
  toPayOsDescription,
  isPayosSignatureBypassEnabled,
} from "@/utils/payos";
import {
  BadRequestException,
  EntityNotFoundException,
  ForbiddenException,
} from "@/shared/exceptions/http-exceptions";
import { isObjectId } from "@/shared/validators/uuid";
import { runInTransaction } from "@/shared/mongoose/transaction";
import type { AccountDocument } from "@/modules/auth/account.model";

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
    const order = payment.order as OrderDocument;
    return {
      orderId: order.id,
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
    const order = await Order.findById(orderId)
      .populate("customerIdOrder")
      .populate("payments");

    if (!order) {
      throw new EntityNotFoundException("Order");
    }

    this.assertOrderAccess(order, requester);

    if (order.paymentMethod !== "ONLINE") {
      throw new BadRequestException("Đơn hàng không dùng thanh toán trực tuyến");
    }

    let payment: PaymentDocument | null =
      ((order.payments ?? []) as PaymentDocument[]).find((p) => p.method === "PAYOS") ?? null;
    if (!payment) {
      payment = await Payment.findOne({ order: orderId, method: "PAYOS" });
    }

    if (payment?.status === "completed") {
      throw new BadRequestException("Đơn hàng đã được thanh toán");
    }

    const orderCode = this.generateUniqueOrderCode();

    if (!payment) {
      payment = new Payment();
      payment.order = order._id;
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

    const payment = await Payment.findOne({ payosOrderCode: orderCode }).populate({
      path: "order",
      populate: { path: "invoices" },
    });

    if (!payment) {
      throw new BadRequestException(
        `Payment with PayOS orderCode ${orderCode} not found`
      );
    }

    if (payment.status === "completed") {
      return;
    }

    const orderId = (payment.order as OrderDocument).id;

    await runInTransaction(async (session) => {
      payment.status = "completed";
      await payment.save({ session: session ?? undefined });

      const order = await Order.findById(orderId)
        .populate("invoices")
        .session(session ?? null);
      if (!order) return;

      order.status = OrderStatus.SHIPPING;
      order.paymentMethod = "PAYOS";
      await order.save({ session: session ?? undefined });

      const invoice = (order.invoices ?? [])[0] as any;
      if (invoice) {
        invoice.status = InvoiceStatus.PAID;
        invoice.paidAt = new Date();
        invoice.paymentMethod = "PAYOS";
        invoice.payment = payment._id;
        await invoice.save({ session: session ?? undefined });
      }
    });

    try {
      const order = await Order.findById(orderId)
        .populate("customerIdOrder")
        .populate({ path: "orderDetails", populate: { path: "product" } });
      if (order) {
        const email =
          (order.customerIdOrder as AccountDocument)?.email ||
          order.guestEmail;
        if (email) {
          const { MailService } = await import("@/utils/mail.service");
          const mailService = Container.get(MailService);
          await mailService.sendOrderConfirmationMail(email, order);
        }
      }
    } catch (err) {
      console.error("Failed to send order confirmation email in webhook:", err);
    }
  }

  private assertOrderAccess(order: OrderDocument, requester?: PayosLinkRequester): void {
    const customer = order.customerIdOrder as AccountDocument | null;
    if (customer) {
      if (!requester?.accountId) {
        throw new ForbiddenException("Yêu cầu đăng nhập để thanh toán đơn này");
      }
      if (customer.id !== requester.accountId) {
        throw new ForbiddenException("Bạn không có quyền thanh toán đơn này");
      }
      return;
    }

    if (!requester?.guestEmail) {
      throw new BadRequestException("Guest cần cung cấp email khớp với đơn hàng");
    }

    const normalizedGuest = requester.guestEmail.trim().toLowerCase();
    if (!order.guestEmail || order.guestEmail.trim().toLowerCase() !== normalizedGuest) {
      throw new ForbiddenException("Email không khớp với đơn hàng");
    }
  }

  private async findPaymentForOrder(
    orderId: string,
    requester?: PayosLinkRequester
  ): Promise<PaymentDocument> {
    const order = await Order.findById(orderId).populate("customerIdOrder");
    if (!order) {
      throw new EntityNotFoundException("Order");
    }
    this.assertOrderAccess(order, requester);

    const payment = await Payment.findOne({ order: orderId }).populate("order");
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
    if (!isObjectId(orderId)) {
      throw new BadRequestException("Mã đơn hàng không hợp lệ");
    }
  }
}

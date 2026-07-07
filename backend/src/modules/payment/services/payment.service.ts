import { Service, Container } from "typedi";
import { randomInt } from "crypto";
import { Payment, PaymentDocument, PaymentStatus, normalizePaymentStatus } from "../models/payment.model";
import { Order, OrderDocument, OrderStatus } from "../../order/models/order.model";
import { Invoice, InvoiceStatus } from "../models/invoice.model";

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
import type { AccountDocument } from "../../auth/models/account.model";

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

    const isInStoreTransfer = order.orderType === 2 && order.paymentMethod === "TRANSFER";
    if (order.paymentMethod !== "ONLINE" && !isInStoreTransfer) {
      throw new BadRequestException("Đơn hàng không dùng thanh toán trực tuyến");
    }

    let payment: PaymentDocument | null =
      ((order.payments ?? []) as PaymentDocument[]).find((p) => p.method === "PAYOS") ?? null;
    if (!payment) {
      payment = await Payment.findOne({ order: orderId, method: "PAYOS" });
    }

    if (normalizePaymentStatus(payment?.status) === PaymentStatus.PAID) {
      throw new BadRequestException("Đơn hàng đã được thanh toán");
    }

    const orderCode = this.generateUniqueOrderCode();

    if (!payment) {
      payment = new Payment();
      payment.order = order._id;
      payment.method = "PAYOS";
      payment.status = PaymentStatus.PENDING;
      payment.amount = Number(order.totalAmount);
    }

    payment.payosOrderCode = String(orderCode);
    payment.amount = Number(order.totalAmount);
    payment.status = PaymentStatus.PENDING;
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

    if (normalizePaymentStatus(payment.status) === PaymentStatus.PAID) {
      return;
    }

    const orderId = (payment.order as OrderDocument).id;

    await runInTransaction(async (session) => {
      payment.status = PaymentStatus.PAID;
      await payment.save({ session: session ?? undefined });

      const order = await Order.findById(orderId)
        .populate("invoices")
        .populate({
          path: "orderDetails",
          populate: { path: "product" },
        } as any)
        .session(session ?? null);
      if (!order) return;

      const now = new Date();

      if (order.orderType === 2) {
        // Đơn tại quầy chuyển khoản: SUCCESSFUL + tạo Invoice (đã trừ kho lúc tạo đơn nên không trừ nữa)
        order.status = OrderStatus.SUCCESSFUL;
        order.completedAt = now;
        order.confirmedAt = now;
        await order.save({ session: session ?? undefined });

        const invoiceNumber = `INV${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getTime()).slice(-6)}`;
        const invoice = new Invoice();
        invoice.order = order._id;
        invoice.invoiceNumber = invoiceNumber;
        invoice.totalAmount = order.totalAmount;
        invoice.status = InvoiceStatus.PAID;
        invoice.paymentMethod = "TRANSFER";
        invoice.payment = payment._id;
        invoice.paidAt = now;
        invoice.taxAmount = order.vatAmount ?? 0;
        invoice.notes = "Thanh toán chuyển khoản tại quầy qua PayOS";
        await invoice.save({ session: session ?? undefined });
      } else {
        // Đơn online chuyển khoản thành công: Trừ tồn kho tại cơ sở phân bổ
        const { Inventory } = await import("../../inventory/models/inventory.model");
        const facilityId = order.facility;
        const { Facility } = await import("../../facility/models/facility.model");
        const facilityDoc = facilityId ? await Facility.findById(facilityId) : null;
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`💳 [PAYOS WEBHOOK] Thanh toán thành công – orderId=${orderId}`);
        console.log(`   🏬 Cơ sở được phân bổ: "${facilityDoc?.name ?? facilityId ?? 'chưa xác định'}"`);

        for (const detail of order.orderDetails ?? []) {
          const productId = (detail.product as any)._id ?? (detail.product as any).id;
          const productName = (detail.product as any)?.name ?? String(productId);
          const inv = await Inventory.findOne({ facility: facilityId, product: productId }).session(session ?? null);
          if (inv) {
            const before = inv.quantity ?? 0;
            inv.quantity = Math.max(0, before - detail.quantity);
            await inv.save({ session: session ?? undefined });
            console.log(`   📦 [${productName}] tồn kho: ${before} → ${inv.quantity} (trừ ${detail.quantity})`);
          } else {
            console.warn(`   ⚠️  [${productName}] không tìm thấy inventory tại cơ sở này!`);
          }
        }
        console.log(`${'─'.repeat(60)}\n`);

        // Đơn online: PROCESSING + cập nhật Invoice có sẵn
        order.status = OrderStatus.PROCESSING;
        order.confirmedAt = now;
        order.paymentMethod = "PAYOS";
        await order.save({ session: session ?? undefined });

        const invoice = (order.invoices ?? [])[0] as any;
        if (invoice) {
          invoice.status = InvoiceStatus.PAID;
          invoice.paidAt = now;
          invoice.paymentMethod = "PAYOS";
          invoice.payment = payment._id;
          await invoice.save({ session: session ?? undefined });
        }
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
    // Đơn tại quầy (orderType=2): không cần xác thực customer/guest
    if (order.orderType === 2) return;

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

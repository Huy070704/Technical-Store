import { Service, Container } from "typedi";
import { randomInt } from "crypto";
import type { ClientSession } from "mongoose";
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


    // ── Sync PayOS cho cả đơn online lẫn tại quầy ────────────────────────────
    // Dùng payosOrderCode (không phải method) làm dấu hiệu "cần đồng bộ với PayOS",
    // vì payment tại quầy chuyển khoản có method="TRANSFER" nhưng vẫn đi qua PayOS.
    const needsSync =
      !!payment.payosOrderCode &&
      normalizePaymentStatus(payment.status) !== PaymentStatus.PAID;

    if (needsSync) {
      await this.syncPaymentIfPaid(payment, order);
      // Reload payment sau khi sync
      const fresh = await Payment.findById(payment.id);
      if (fresh) {
        return {
          orderId: order.id,
          status: fresh.status,
          amount: Number(fresh.amount),
          paymentMethod: fresh.method,
          transactionId: fresh.id,
          createdAt: fresh.createdAt,
          updatedAt: fresh.updatedAt,
        };
      }
    }

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

  /**
   * Hàm sync PayOS dùng chung cho cả đơn online (orderType=1) lẫn tại quầy (orderType=2).
   * - Online   : trừ kho → Order PROCESSING → Invoice PAID
   * - Tại quầy: Order SUCCESSFUL → tạo Invoice nếu chưa có (kho đã trừ lúc tạo đơn)
   */
  public async syncPaymentIfPaid(
    payment: PaymentDocument,
    order: OrderDocument
  ): Promise<void> {
    try {
      const payosInfo = await payos.getPaymentLinkInformation(
        Number(payment.payosOrderCode)
      );

      const payosStatus = String((payosInfo as any).status ?? "").toUpperCase();
      const isPaid = ["PAID", "COMPLETED", "SUCCESS", "SUCCESSFUL"].includes(payosStatus);
      if (!isPaid) return;

      const isInStore = order.orderType === 2;

      if (!isInStore) {
        await this.ensureOnlineOrderFacility(order.id);
      }

      await runInTransaction(async (session) => {
        // Guard: tránh double-update
        const paymentToUpdate = await Payment.findById(payment.id).session(session ?? null);
        if (!paymentToUpdate) return;
        if (normalizePaymentStatus(paymentToUpdate.status) === PaymentStatus.PAID) return;

        paymentToUpdate.status = PaymentStatus.PAID;
        paymentToUpdate.paidAt = new Date();
        await paymentToUpdate.save({ session: session ?? undefined });

        // Đơn đã thanh toán qua payment này → hủy mọi payment PENDING thừa khác của cùng đơn
        await this.cancelStalePendingPayments(order.id, paymentToUpdate.id, session);

        const orderToUpdate = await Order.findById(order.id)
          .populate("invoices")
          .populate({ path: "orderDetails", populate: { path: "product" } } as any)
          .session(session ?? null);
        if (!orderToUpdate) return;

        // Guard: đơn đã được xử lý rồi (webhook chạy trước) → bỏ qua
        const alreadyDone = isInStore
          ? orderToUpdate.status === OrderStatus.SUCCESSFUL
          : orderToUpdate.status !== OrderStatus.PENDING;
        if (alreadyDone) return;

        const now = new Date();

        if (isInStore) {
          // ── Đơn tại quầy: kho đã trừ lúc tạo đơn, chỉ cần đổi trạng thái
          const existingInvoices = (orderToUpdate.invoices ?? []) as any[];
          if (existingInvoices.length === 0) {
            const invoiceNumber = `INV${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getTime()).slice(-6)}`;
            const invoice = new Invoice();
            invoice.order = orderToUpdate._id;
            invoice.invoiceNumber = invoiceNumber;
            invoice.totalAmount = orderToUpdate.totalAmount;
            invoice.status = InvoiceStatus.PAID;
            invoice.paymentMethod = "TRANSFER";
            invoice.payment = paymentToUpdate._id;
            invoice.paidAt = now;
            invoice.taxAmount = orderToUpdate.vatAmount ?? 0;
            invoice.notes = "Thanh toán chuyển khoản tại quầy qua PayOS";
            await invoice.save({ session: session ?? undefined });
          }

          orderToUpdate.status = OrderStatus.SUCCESSFUL;
          orderToUpdate.completedAt = now;
          orderToUpdate.confirmedAt = now;
          await orderToUpdate.save({ session: session ?? undefined });

          console.log(`✅ [syncPayment] orderId=${order.id} → SUCCESSFUL (tại quầy, PayOS: ${payosStatus})`);
        } else {
          // ── Đơn online: trừ kho → PROCESSING
          const { Inventory } = await import("../../inventory/models/inventory.model");
          const facilityId = orderToUpdate.facility;
          for (const detail of orderToUpdate.orderDetails ?? []) {
            const productId = (detail.product as any)._id ?? (detail.product as any).id;
            const inv = await Inventory.findOne({ facility: facilityId, product: productId }).session(session ?? null);
            if (inv) {
              inv.quantity = Math.max(0, (inv.quantity ?? 0) - detail.quantity);
              await inv.save({ session: session ?? undefined });
            }
          }

          orderToUpdate.status = OrderStatus.PROCESSING;
          orderToUpdate.confirmedAt = now;
          orderToUpdate.paymentMethod = "PAYOS";
          await orderToUpdate.save({ session: session ?? undefined });

          const invoice = (orderToUpdate.invoices ?? [])[0] as any;
          if (invoice) {
            invoice.status = InvoiceStatus.PAID;
            invoice.paidAt = now;
            invoice.paymentMethod = "PAYOS";
            invoice.payment = paymentToUpdate._id;
            await invoice.save({ session: session ?? undefined });
          }

          console.log(`✅ [syncPayment] orderId=${order.id} → PROCESSING (online, PayOS: ${payosStatus})`);
        }
      });
    } catch (err) {
      console.warn("[syncPayment] Không thể query PayOS:", (err as Error).message);
    }
  }

  /**
   * Hủy mọi payment PENDING khác của cùng đơn (trừ payment vừa được thanh toán).
   * Xử lý trường hợp đơn tại quầy tạo lại QR nhiều lần: mỗi lần tạo mã mới có thể
   * để lại payment PENDING cũ chưa được dọn — khi đơn đã thanh toán qua một payment,
   * các payment PENDING còn lại cần được đánh dấu hủy để không còn hiển thị lửng lơ
   * là "chưa thanh toán" trong danh sách.
   */
  private async cancelStalePendingPayments(
    orderId: string,
    keepPaymentId: string,
    session: ClientSession | undefined
  ): Promise<void> {
    const stale = await Payment.find({
      order: orderId,
      _id: { $ne: keepPaymentId },
      status: { $nin: ["PAID", "COMPLETED", "SUCCESS", "SUCCESSFUL", "CANCELLED"] },
    }).session(session ?? null);

    for (const p of stale) {
      if (p.payosOrderCode) {
        try {
          await payos.cancelPaymentLink(
            Number(p.payosOrderCode),
            "Đơn hàng đã được thanh toán qua giao dịch khác"
          );
        } catch (err) {
          console.warn("Không hủy được link PayOS thừa:", (err as Error).message);
        }
      }
      p.status = PaymentStatus.CANCELLED;
      await p.save({ session: session ?? undefined });
    }
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

    const isInStore = order.orderType === 2;
    if (order.paymentMethod !== "ONLINE" && !isInStore) {
      throw new BadRequestException("Đơn hàng không dùng thanh toán trực tuyến");
    }

    // Nếu là đơn tại quầy và có phương thức CASH, đổi sang TRANSFER
    if (isInStore && order.paymentMethod === "CASH") {
      order.paymentMethod = "TRANSFER";
      await order.save();
    }

    // Đơn tại quầy chuyển khoản vẫn đi qua cổng PayOS (QR) nhưng method hiển thị
    // phải là "TRANSFER" — chỉ đơn online mới thực sự là "PAYOS" (thanh toán trước).
    const payMethod = isInStore ? "TRANSFER" : "PAYOS";

    // Tìm payment PayOS gần nhất của đơn qua payosOrderCode (không dùng method vì
    // method hiển thị có thể khác nhau giữa tại quầy/online dù cùng đi qua PayOS).
    // Lấy bản ghi mới nhất để không chọn nhầm một payment cũ nếu lỡ có nhiều bản ghi.
    const candidates = ((order.payments ?? []) as PaymentDocument[])
      .filter((p) => !!p.payosOrderCode)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    let payment: PaymentDocument | null =
      candidates[0] ??
      (await Payment.findOne({ order: orderId, payosOrderCode: { $exists: true, $ne: null } }).sort({
        createdAt: -1,
      }));

    if (normalizePaymentStatus(payment?.status) === PaymentStatus.PAID) {
      throw new BadRequestException("Đơn hàng đã được thanh toán");
    }

    // Hủy link PayOS cũ đang được thay thế (nếu có) — tránh trường hợp khách vẫn
    // thanh toán được vào QR cũ sau khi hệ thống đã chuyển sang theo dõi mã mới.
    if (payment?.payosOrderCode) {
      try {
        await payos.cancelPaymentLink(Number(payment.payosOrderCode), "Tạo lại link thanh toán mới");
      } catch (err) {
        console.warn("Không hủy được link PayOS cũ:", (err as Error).message);
      }
    }

    const orderCode = this.generateUniqueOrderCode();

    if (!payment) {
      payment = new Payment();
      payment.order = order._id;
      payment.status = PaymentStatus.PENDING;
      payment.amount = Number(order.totalAmount);
    }

    payment.method = payMethod;
    payment.payosOrderCode = String(orderCode);
    payment.amount = Number(order.totalAmount);
    payment.status = PaymentStatus.PENDING;
    await payment.save();

    // Dọn mọi payment PENDING thừa khác của cùng đơn (phòng dữ liệu cũ bị trùng).
    await this.cancelStalePendingPayments(orderId, payment.id, undefined);

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
    const isInStoreOrder = (payment.order as OrderDocument).orderType === 2;

    if (!isInStoreOrder) {
      await this.ensureOnlineOrderFacility(orderId);
    }

    await runInTransaction(async (session) => {
      // Re-fetch trong transaction và guard PAID để chống double-update: webhook và
      // polling (syncPaymentIfPaid) có thể chạy song song. Guard ở trên (dòng ~347)
      // nằm NGOÀI transaction nên không đủ — nếu polling commit PAID xen vào giữa,
      // webhook sẽ trừ kho lần 2. Kiểm tra lại status bên trong txn để tránh điều đó.
      const paymentToUpdate = await Payment.findById(payment.id).session(session ?? null);
      if (!paymentToUpdate) return;
      if (normalizePaymentStatus(paymentToUpdate.status) === PaymentStatus.PAID) return;

      paymentToUpdate.status = PaymentStatus.PAID;
      // Tự sửa method cho các payment cũ tạo trước khi tách TRANSFER/PAYOS theo loại đơn.
      paymentToUpdate.method = isInStoreOrder ? "TRANSFER" : "PAYOS";
      await paymentToUpdate.save({ session: session ?? undefined });

      // Đơn đã thanh toán qua payment này → hủy mọi payment PENDING thừa khác của cùng đơn
      await this.cancelStalePendingPayments(orderId, payment.id, session);

      const order = await Order.findById(orderId)
        .populate("invoices")
        .populate({
          path: "orderDetails",
          populate: { path: "product" },
        } as any)
        .session(session ?? null);
      if (!order) return;

      if (order.status === OrderStatus.CANCELLED) {
        console.warn(`Order ${orderId} was already cancelled. Ignoring payment webhook.`);
        return;
      }

      const now = new Date();

      if (order.orderType === 2) {
        // Đơn tại quầy chuyển khoản: SUCCESSFUL + tạo Invoice (đã trừ kho lúc tạo đơn nên không trừ nữa)
        // Guard: tránh double-update nếu webhook gọi lại
        if (order.status !== OrderStatus.SUCCESSFUL) {
          order.status = OrderStatus.SUCCESSFUL;
          order.completedAt = now;
          order.confirmedAt = now;
          await order.save({ session: session ?? undefined });
        }

        // Guard: chỉ tạo Invoice nếu chưa có
        const existingInvoices = (order.invoices ?? []) as any[];
        if (existingInvoices.length === 0) {
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
        }
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

  /** Thanh toán được phép diễn ra ngay; chỉ bước xử lý kho phía backend cần đợi facility. */
  private async ensureOnlineOrderFacility(orderId: string): Promise<void> {
    const { OrderService } = await import("../../order/services/order.service");
    const facilityId = await Container.get(OrderService).ensureFacilityAssigned(orderId);
    if (!facilityId) {
      throw new BadRequestException(
        "Chưa thể phân cơ sở xử lý đơn hàng. Hệ thống sẽ tự động thử lại."
      );
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

  /**
   * Đồng bộ thủ công trạng thái thanh toán cho 1 đơn online cụ thể.
   * Staff gọi khi webhook không reach được (môi trường dev/localhost).
   * Trả về true nếu đã sync thành công (đơn PENDING → PROCESSING),
   * false nếu đơn chưa được thanh toán hoặc đã ở trạng thái khác.
   */
  async syncOrderPayment(orderId: string): Promise<{ synced: boolean; message: string }> {
    this.assertValidOrderId(orderId);

    const payment = await Payment.findOne({ order: orderId }).populate("order");
    if (!payment) {
      return { synced: false, message: "Không tìm thấy payment cho đơn hàng này" };
    }

    // Đã PAID rồi — không cần sync
    if (normalizePaymentStatus(payment.status) === PaymentStatus.PAID) {
      return { synced: false, message: "Đơn hàng đã được thanh toán trước đó" };
    }

    if (!payment.payosOrderCode) {
      return { synced: false, message: "Đơn hàng chưa có mã PayOS" };
    }

    const order = payment.order as OrderDocument;
    await this.syncPaymentIfPaid(payment, order);

    // Kiểm tra lại sau khi sync
    const updatedOrder = await Order.findById(orderId);
    if (!updatedOrder) {
      return { synced: false, message: "Không tìm thấy đơn hàng" };
    }

    const wasSynced = updatedOrder.status !== OrderStatus.PENDING;

    if (wasSynced) {
      return { synced: true, message: `Đồng bộ thành công — trạng thái đơn: ${updatedOrder.status}` };
    }
    return { synced: false, message: "Thanh toán chưa được xác nhận từ PayOS" };
  }
}

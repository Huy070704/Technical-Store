import cron from "node-cron";
import { Order, OrderStatus } from "../models/order.model";
import { Invoice, InvoiceStatus } from "../../payment/models/invoice.model";
import { Payment, PaymentStatus, isPaidStatus } from "../../payment/models/payment.model";
import { PaymentService } from "../../payment/services/payment.service";
import { Container } from "typedi";

const UNPAID_TIMEOUT_MINUTES = 15;

async function cancelUnpaidOrders(): Promise<void> {
  const cutoff = new Date(Date.now() - UNPAID_TIMEOUT_MINUTES * 60 * 1000);

  const expiredOrders = await Order.find({
    status: OrderStatus.PENDING,
    paymentMethod: "ONLINE",
    orderAt: { $lt: cutoff },
  }).populate([
    { path: "invoices" },
    { path: "payments" },
  ] as any);

  if (!expiredOrders.length) return;

  console.log(`[CronJob] Tìm thấy ${expiredOrders.length} đơn ONLINE chưa thanh toán quá ${UNPAID_TIMEOUT_MINUTES} phút → tự động hủy`);

  for (const order of expiredOrders) {
    try {
      // Kiểm tra payment đã thanh toán chưa (an toàn — đơn PENDING lẽ ra chưa trả)
      const payments = (order.payments ?? []) as any[];
      const isPaid = payments.some((p) => isPaidStatus(p.status));
      if (isPaid) continue; // đã thanh toán, bỏ qua

      // KHÔNG hoàn kho: đơn online chỉ bị trừ kho sau khi PayOS duyệt thanh toán
      // (lúc đó đơn đã chuyển PROCESSING, không còn lọt bộ lọc PENDING này nữa).
      // Đơn PENDING chưa thanh toán ⇒ chưa từng trừ kho ⇒ không có gì để hoàn.

      // Hủy link PayOS còn mở + đánh dấu payment CANCELLED, nếu không khách vẫn có
      // thể quét QR trả tiền cho đơn đã tự hủy → webhook bỏ qua đơn CANCELLED và
      // tiền không tự hoàn.
      for (const p of payments) {
        if (p.payosOrderCode && !isPaidStatus(p.status)) {
          try {
            const { payos } = await import("@/utils/payos");
            await payos.cancelPaymentLink(
              Number(p.payosOrderCode),
              `Tự động hủy: không thanh toán sau ${UNPAID_TIMEOUT_MINUTES} phút`
            );
          } catch (err) {
            console.error(`[CronJob] Lỗi hủy link PayOS đơn ${order.id}:`, err);
          }
        }
      }
      await Payment.updateMany(
        { order: order._id, status: { $nin: ["PAID", "COMPLETED", "SUCCESS", "SUCCESSFUL", "CANCELLED"] } },
        { $set: { status: PaymentStatus.CANCELLED } }
      );

      // Hủy invoice
      const invoice = (order.invoices ?? [])[0] as any;
      if (invoice && invoice.status === InvoiceStatus.UNPAID) {
        invoice.status = InvoiceStatus.CANCELLED;
        await invoice.save();
      }

      // Hủy order
      order.status = OrderStatus.CANCELLED;
      order.cancelReason = `Tự động hủy: không thanh toán sau ${UNPAID_TIMEOUT_MINUTES} phút`;
      order.cancelAt = new Date();
      await order.save();

      console.log(`[CronJob] Đã hủy đơn ${order.id}`);
    } catch (err) {
      console.error(`[CronJob] Lỗi khi hủy đơn ${order.id}:`, err);
    }
  }
}

/**
 * Sync tất cả payment PayOS chưa PAID (cả online lẫn tại quầy) với PayOS API.
 * Dùng PaymentService.syncPaymentIfPaid — cùng logic với polling từ frontend.
 * Chạy mỗi phút để không phụ thuộc webhook (webhook không reach được localhost/dev).
 */
async function syncPendingPayosOrders(): Promise<void> {
  const cutoff = new Date(Date.now() - UNPAID_TIMEOUT_MINUTES * 60 * 1000);

  // Lấy tất cả Payment đi qua PayOS chưa PAID trong vòng 15 phút (cả online + tại quầy).
  // Dùng payosOrderCode làm dấu hiệu — không lọc theo method vì payment tại quầy
  // chuyển khoản có method="TRANSFER" dù vẫn đi qua PayOS.
  const pendingPayments = await Payment.find({
    status: { $nin: ["PAID", "COMPLETED", "SUCCESS", "SUCCESSFUL", "CANCELLED"] },
    payosOrderCode: { $exists: true, $ne: null },
    createdAt: { $gte: cutoff },
  }).populate({
    path: "order",
    populate: [
      { path: "invoices" },
      { path: "orderDetails", populate: { path: "product" } },
    ],
  });

  if (!pendingPayments.length) return;

  console.log(`[CronJob:SyncPayos] Kiểm tra ${pendingPayments.length} payment PAYOS đang chờ...`);

  const paymentService = Container.get(PaymentService);

  for (const payment of pendingPayments) {
    const order = payment.order as any;
    if (!order) continue;

    // Chỉ sync đơn đang ở trạng thái chờ thanh toán:
    // - Online (orderType=1): PENDING
    // - Tại quầy (orderType=2): PROCESSING (đơn quầy bắt đầu ở PROCESSING)
    const isOnlinePending = order.orderType === 1 && order.status === OrderStatus.PENDING;
    const isInStorePending = order.orderType === 2 && order.status === OrderStatus.PROCESSING;
    if (!isOnlinePending && !isInStorePending) continue;

    try {
      await paymentService.syncPaymentIfPaid(payment, order);
    } catch (err) {
      console.warn(`[CronJob:SyncPayos] Lỗi khi sync orderId=${order.id}:`, (err as Error).message);
    }
  }
}

export function startOrderCronJobs(): void {
  // Mỗi phút: sync payment PAYOS chưa được xác nhận (thay thế webhook trên localhost)
  cron.schedule("* * * * *", async () => {
    try {
      await syncPendingPayosOrders();
    } catch (err) {
      console.error("[CronJob] syncPendingPayosOrders error:", err);
    }
  });

  // Mỗi 5 phút: hủy đơn online quá hạn chưa thanh toán
  cron.schedule("*/5 * * * *", async () => {
    try {
      await cancelUnpaidOrders();
    } catch (err) {
      console.error("[CronJob] cancelUnpaidOrders error:", err);
    }
  });

  console.log("✅ Order cron jobs started (sync PayOS every 1 min | cancel unpaid every 5 min)");
}

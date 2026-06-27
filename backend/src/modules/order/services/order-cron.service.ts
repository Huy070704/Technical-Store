import cron from "node-cron";
import { Order, OrderStatus } from "../models/order.model";
import { Invoice, InvoiceStatus } from "../../payment/models/invoice.model";
import { Payment } from "../../payment/models/payment.model";
import { Product } from "../../product/models/product.model";
import { OrderDetail } from "../models/orderDetail.model";

const UNPAID_TIMEOUT_MINUTES = 15;

async function cancelUnpaidOrders(): Promise<void> {
  const cutoff = new Date(Date.now() - UNPAID_TIMEOUT_MINUTES * 60 * 1000);

  const expiredOrders = await Order.find({
    status: OrderStatus.PENDING,
    paymentMethod: "ONLINE",
    orderAt: { $lt: cutoff },
  }).populate([
    { path: "orderDetails", populate: { path: "product" } },
    { path: "invoices" },
    { path: "payments" },
  ] as any);

  if (!expiredOrders.length) return;

  console.log(`[CronJob] Tìm thấy ${expiredOrders.length} đơn ONLINE chưa thanh toán quá ${UNPAID_TIMEOUT_MINUTES} phút → tự động hủy`);

  for (const order of expiredOrders) {
    try {
      // Kiểm tra payment có completed không
      const payments = (order.payments ?? []) as any[];
      const isPaid = payments.some((p) => p.status === "completed");
      if (isPaid) continue; // đã thanh toán, bỏ qua

      // Hoàn lại tồn kho
      const details = await OrderDetail.find({ order: order._id }).populate("product");
      for (const detail of details) {
        const product = await Product.findById((detail.product as any)?._id ?? detail.product);
        if (product) {
          product.stock = (product.stock ?? 0) + detail.quantity;
          await product.save();
        }
      }

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

export function startOrderCronJobs(): void {
  // Chạy mỗi 5 phút
  cron.schedule("*/5 * * * *", async () => {
    try {
      await cancelUnpaidOrders();
    } catch (err) {
      console.error("[CronJob] cancelUnpaidOrders error:", err);
    }
  });

  console.log("✅ Order cron jobs started (check unpaid every 5 min)");
}

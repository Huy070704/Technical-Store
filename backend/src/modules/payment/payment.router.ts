import { PaymentController } from "./controllers/payment.controller";

export const PaymentRouter = {
  name: "Online Payment Gateway API",
  basePath: "/payment",
  routes: [
    {
      path: "/payos-link/:orderId",
      method: "POST",
      action: PaymentController.prototype.createPayosLink,
      auth: "Optional/GuestAllowed",
      description: "Tạo liên kết thanh toán PayOS trực tuyến cho đơn hàng",
    },
    {
      path: "/status/:orderId",
      method: "GET",
      action: PaymentController.prototype.getPaymentStatus,
      auth: "Optional/GuestAllowed",
      description: "Lấy trạng thái giao dịch thanh toán trực tuyến của đơn hàng",
    },
    {
      path: "/payos-webhook",
      method: "POST",
      action: PaymentController.prototype.handlePayosWebhook,
      auth: false,
      description: "Webhook nhận kết quả thanh toán từ hệ thống PayOS",
    },
  ],
};

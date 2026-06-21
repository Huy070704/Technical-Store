import { OtpController } from "./controllers/otp.controller";

export const OtpRouter = {
  name: "OTP Verification API",
  basePath: "/otp",
  routes: [
    {
      path: "/active",
      method: "GET",
      action: OtpController.prototype.getActiveOtp,
      auth: "AdminOnly",
      description: "Xem danh sách mã OTP đang còn hiệu lực và dọn dẹp mã hết hạn",
    },
    {
      path: "/send",
      method: "POST",
      action: OtpController.prototype.sendOtp,
      rateLimit: "otpRateLimiter",
      auth: false,
      description: "Gửi mã OTP xác thực qua email",
    },
    {
      path: "/verify",
      method: "POST",
      action: OtpController.prototype.verifyOtp,
      auth: false,
      description: "Xác thực mã OTP của người dùng",
    },
  ],
};

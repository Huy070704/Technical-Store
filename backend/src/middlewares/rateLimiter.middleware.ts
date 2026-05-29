
import rateLimit from "express-rate-limit";

// Giới hạn Login/Đăng ký: 5 lần / 15 phút
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 7, // Limit each IP to 5 requests per `window`
  message: {
    success: false,
    message: "Quá nhiều lần đăng nhập hoặc đăng ký. Thử lại sau 15 phút."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Giới hạn OTP: 3 lần / 5 phút
export const otpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3, // Limit each IP to 3 requests per `window`
  message: {
    success: false,
    message: "Quá nhiều yêu cầu gửi hoặc xác thực OTP. Thử lại sau 5 phút."
  },
  standardHeaders: true,
  legacyHeaders: false,
});

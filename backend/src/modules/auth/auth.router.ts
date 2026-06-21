import { AccountController } from "./controllers/account.controller";
import { JwtController } from "./controllers/jwt.controller";
import { RoleController } from "./controllers/role.controller";

export const AuthRouter = {
  name: "Auth & Account Management API",
  routes: [
    // ─── Account Routes ────────────────────────────
    {
      basePath: "/account",
      endpoints: [
        {
          path: "/register",
          method: "POST",
          action: AccountController.prototype.register,
          rateLimit: "loginRateLimiter",
          auth: false,
          description: "Đăng ký tài khoản thành viên mới",
        },
        {
          path: "/verify-register",
          method: "POST",
          action: AccountController.prototype.verifyRegister,
          auth: false,
          description: "Xác thực mã OTP đăng ký tài khoản",
        },
        {
          path: "/registration-cancelled",
          method: "DELETE",
          action: AccountController.prototype.cancelRegistrations,
          auth: false,
          description: "Hủy bỏ đăng ký chưa kích hoạt (dọn dẹp)",
        },
        {
          path: "/login",
          method: "POST",
          action: AccountController.prototype.login,
          rateLimit: "loginRateLimiter",
          auth: false,
          description: "Đăng nhập hệ thống",
        },
        {
          path: "/logout",
          method: "POST",
          action: AccountController.prototype.logout,
          auth: true,
          description: "Đăng xuất hệ thống",
        },
        {
          path: "/resend-otp",
          method: "POST",
          action: AccountController.prototype.resendOtp,
          rateLimit: "otpRateLimiter",
          auth: false,
          description: "Gửi lại OTP xác thực",
        },
        {
          path: "/change-password",
          method: "POST",
          action: AccountController.prototype.preChangePassword,
          auth: true,
          description: "Yêu cầu thay đổi mật khẩu (gửi OTP)",
        },
        {
          path: "/verify-change-password",
          method: "POST",
          action: AccountController.prototype.verifyChangePassword,
          auth: false,
          description: "Xác thực OTP và hoàn tất đổi mật khẩu",
        },
        {
          path: "/forgot-password",
          method: "POST",
          action: AccountController.prototype.forgotPassword,
          rateLimit: "otpRateLimiter",
          auth: false,
          description: "Yêu cầu quên mật khẩu (gửi OTP)",
        },
        {
          path: "/details",
          method: "GET",
          action: AccountController.prototype.viewAccountDetails,
          auth: true,
          description: "Xem chi tiết tài khoản hiện tại",
        },
        {
          path: "/all",
          method: "GET",
          action: AccountController.prototype.getAllAccounts,
          auth: "Admin/Manager",
          permission: { action: "read", subject: "Account" },
          description: "Lấy danh sách tất cả tài khoản trong hệ thống",
        },
        {
          path: "/create",
          method: "POST",
          action: AccountController.prototype.createAccount,
          auth: "Admin/Manager",
          permission: { action: "create", subject: "Account" },
          description: "Tạo tài khoản mới bởi quản trị viên",
        },
        {
          path: "/update",
          method: "PATCH",
          action: AccountController.prototype.updateAccount,
          auth: "Admin/Manager",
          permission: { action: "update", subject: "Account" },
          description: "Cập nhật thông tin tài khoản",
        },
        {
          path: "/delete",
          method: "DELETE",
          action: AccountController.prototype.deleteAccount,
          auth: "Admin/Manager",
          permission: { action: "delete", subject: "Account" },
          description: "Xóa tài khoản theo email",
        },
        {
          path: "/update-admin",
          method: "PATCH",
          action: AccountController.prototype.updateAdmin,
          auth: "AdminOnly",
          description: "Quản trị viên cập nhật thông tin đặc quyền tài khoản",
        },
      ],
    },
    // ─── JWT Routes ────────────────────────────────
    {
      basePath: "/jwt",
      endpoints: [
        {
          path: "/refresh-token",
          method: "POST",
          action: JwtController.prototype.refreshToken,
          auth: false,
          description: "Cấp lại Access Token mới bằng Refresh Token qua cookie",
        },
        {
          path: "/verify-access-token",
          method: "POST",
          action: JwtController.prototype.verifyAccessToken,
          auth: false,
          description: "Xác thực Access Token",
        },
      ],
    },
    // ─── Role Routes ───────────────────────────────
    {
      basePath: "/auth",
      endpoints: [
        {
          path: "/roles",
          method: "GET",
          action: RoleController.prototype.getAllRoles,
          auth: true,
          permission: { action: "read", subject: "Role" },
          description: "Lấy danh sách các vai trò trong hệ thống",
        },
        {
          path: "/roles/create-roles",
          method: "POST",
          action: RoleController.prototype.createRoles,
          auth: "AdminOnly",
          description: "Tạo danh sách vai trò mặc định",
        },
      ],
    },
  ],
};

import {
  Body,
  BodyParam,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UseBefore,
} from "routing-controllers";
import { HttpException } from "@/shared/exceptions/http-exceptions";
import { Service } from "typedi";
import {
  loginRateLimiter,
  otpRateLimiter,
} from "@/middlewares/rateLimiter.middleware";
import { AccountService } from "../services/account.service";
import { AccountDetailsDto } from "../account.types";
import { parseBody } from "@/shared/validators/parse-body";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

const registerSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  name: z.string().min(2, "Tên tối thiểu 2 ký tự"),
  phone: z.string().optional(),
});

const verifyRegisterSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  otp: z.string().length(6, "OTP phải có đúng 6 chữ số"),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Mật khẩu cũ không được trống"),
});

const verifyChangePasswordSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  otp: z.string().length(6, "OTP phải có đúng 6 chữ số"),
  newPassword: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự"),
});

const forgotPasswordEmailSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

const resendOtpSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

const createAccountSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  name: z.string().min(2, "Tên tối thiểu 2 ký tự"),
  phone: z.string().optional(),
  roleSlug: z.string().min(1, "Role không được trống"),
});

const updateAccountSchema = z.object({
  email: z.string().email("Email không hợp lệ").optional(),
  phone: z.string().optional(),
  name: z.string().min(2, "Tên tối thiểu 2 ký tự").optional(),
  roleSlug: z.string().optional(),
  isBlocked: z.boolean().optional(),
});
import { Admin, Auth } from "@/middlewares/auth.middleware";
import { Response } from "express";
import { OtpService } from "../../otp/services/otp.service";
import { Account } from "../models/account.model";
import { CheckAbility } from "@/middlewares/rbac/permission.decorator";

@Service()
@Controller("/account")
export class AccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly otpService: OtpService,
  ) {}

  @Post("/register")
  @UseBefore(loginRateLimiter)
  async register(@Body({ validate: false }) body: unknown) {
    const dto = parseBody(registerSchema, body);
    const account = await this.accountService.register(dto);
    await this.otpService.sendOtp(account.email);
    return {
      message:
        "Mã OTP đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư (và thư mục Spam).",
    };
  }

  @Post("/verify-register")
  async verifyRegister(@Body({ validate: false }) body: unknown, @Res() res: Response) {
    const dto = parseBody(verifyRegisterSchema, body);
    const email = dto.email.trim().toLowerCase();
    const tokens = await this.accountService.finalizeRegistration(
      email,
      dto.otp,
    );

    res.cookie("refreshToken", tokens.newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    return { accessToken: tokens.accessToken };
  }

  @Delete("/registration-cancelled")
  async cancelRegistrations() {
    await this.accountService.removeNewAccounts();
  }

  @Post("/login")
  @UseBefore(loginRateLimiter)
  async login(@Body({ validate: false }) body: unknown, @Res() res: Response) {
    const dto = parseBody(loginSchema, body);
    const tokens = await this.accountService.login({
      email: dto.email.trim().toLowerCase(),
      password: dto.password,
    });

    res.cookie("refreshToken", tokens.newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });
    return { accessToken: tokens.accessToken };
  }

  @Post("/logout")
  @UseBefore(Auth)
  async logout(@Req() req: any, @Res() res: Response) {
    const user = req.user as AccountDetailsDto;
    await this.accountService.logout(user.accountId);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    return { message: "Đăng xuất thành công" };
  }

  @Post("/resend-otp")
  @UseBefore(otpRateLimiter)
  async resendOtp(@Body({ validate: false }) body: unknown) {
    const dto = parseBody(resendOtpSchema, body);
    await this.otpService.sendOtp(dto.email.trim().toLowerCase());
    return { message: "OTP đã được gửi lại tới email của bạn" };
  }

  @Post("/change-password")
  @UseBefore(Auth)
  async preChangePassword(@Req() req: any, @Body({ validate: false }) body: unknown) {
    const dto = parseBody(changePasswordSchema, body);
    const user = req.user as AccountDetailsDto;
    const account = await this.accountService.findAccountByEmail(user.email);
    const ok = await this.accountService.checkOldPassword(
      account,
      dto.oldPassword,
    );
    if (!ok) throw new HttpException(400, "Mật khẩu cũ không đúng");
    await this.otpService.sendOtp(account.email);
    return { message: "Kiểm tra OTP trong email để hoàn tất đổi mật khẩu" };
  }

  @Post("/verify-change-password")
  async verifyChangePassword(@Body({ validate: false }) body: unknown) {
    const dto = parseBody(verifyChangePasswordSchema, body);
    const email = dto.email.trim().toLowerCase();
    const account = await this.accountService.findAccountByEmail(email);
    const result = await this.otpService.verifyOtp(account.email, dto.otp);
    this.otpService.assertOtpVerified(result);
    await this.accountService.changePassword(account, dto.newPassword);
    return { message: "Đổi mật khẩu thành công" };
  }

  @Post("/forgot-password")
  @UseBefore(otpRateLimiter)
  async forgotPassword(@Body({ validate: false }) body: unknown) {
    const dto = parseBody(forgotPasswordEmailSchema, body);
    const account = await this.accountService.findAccountByEmail(
      dto.email.trim().toLowerCase(),
    );
    await this.otpService.sendOtp(account.email);
    return { message: "Kiểm tra OTP trong email để đặt lại mật khẩu" };
  }

  @Get("/details")
  @UseBefore(Auth)
  async viewAccountDetails(@Req() req: any) {
    const user = req.user as AccountDetailsDto;
    return await this.accountService.findAccountByEmail(user.email);
  }

  @Get("/all")
  @UseBefore(Auth)
  @CheckAbility("read", Account)
  async getAllAccounts(@Req() req: any) {
    return await this.accountService.getAccounts();
  }

  @Post("/create")
  @UseBefore(Auth)
  @CheckAbility("create", Account)
  async createAccount(@Body({ validate: false }) body: unknown) {
    const dto = parseBody(createAccountSchema, body);
    return await this.accountService.createAccount(
      dto.email,
      dto.password,
      dto.name,
      dto.phone,
      dto.roleSlug,
    );
  }

  @Patch("/update")
  @UseBefore(Auth)
  @CheckAbility("update", Account)
  async updateAccount(
    @Req() req: any,
    @BodyParam("email") email: string,
    @Body({ validate: false }) body: unknown,
  ) {
    const dto = parseBody(updateAccountSchema, body);
    const caller = req.user as AccountDetailsDto;
    return await this.accountService.updateAccount(email, dto, caller);
  }

  @Delete("/delete")
  @UseBefore(Auth)
  @CheckAbility("delete", Account)
  async deleteAccount(@BodyParam("email") email: string) {
    return await this.accountService.deleteAccount(email);
  }

  @Patch("/update-admin")
  @UseBefore(Admin)
  async updateAdmin(
    @BodyParam("email") email: string,
    @Body({ validate: false }) body: unknown,
  ) {
    const dto = parseBody(updateAccountSchema, body);
    return await this.accountService.updateAdmin(email, dto);
  }
}

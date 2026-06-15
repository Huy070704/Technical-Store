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
import {
  AccountDetailsDto,
  ChangePasswordDto,
  CreateAccountDto,
  ForgotPasswordEmailDto,
  LoginDto,
  RegisterDto,
  ResendOtpDto,
  UpdateAccountDto,
  VerifyChangePasswordDto,
  VerifyRegisterDto,
} from "../dtos/account.dto";
import { Admin, Auth } from "@/middlewares/auth.middleware";
import { Response } from "express";
import { OtpService } from "../../otp/services/otp.service";
import { Account } from "../account.entity";
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
  async register(@Body() body: RegisterDto) {
    const account = await this.accountService.register(body);
    await this.otpService.sendOtp(account.email);
    return {
      message:
        "Mã OTP đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư (và thư mục Spam).",
    };
  }

  @Post("/verify-register")
  async verifyRegister(@Body() body: VerifyRegisterDto, @Res() res: Response) {
    const email = body.email.trim().toLowerCase();
    const tokens = await this.accountService.finalizeRegistration(
      email,
      body.otp,
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
  async login(@Body() body: LoginDto, @Res() res: Response) {
    const tokens = await this.accountService.login({
      email: body.email.trim().toLowerCase(),
      password: body.password,
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
  async resendOtp(@Body() body: ResendOtpDto) {
    await this.otpService.sendOtp(body.email.trim().toLowerCase());
    return { message: "OTP đã được gửi lại tới email của bạn" };
  }

  @Post("/change-password")
  @UseBefore(Auth)
  async preChangePassword(@Req() req: any, @Body() body: ChangePasswordDto) {
    const user = req.user as AccountDetailsDto;
    const account = await this.accountService.findAccountByEmail(user.email);
    const ok = await this.accountService.checkOldPassword(
      account,
      body.oldPassword,
    );
    if (!ok) throw new HttpException(400, "Mật khẩu cũ không đúng");
    await this.otpService.sendOtp(account.email);
    return { message: "Kiểm tra OTP trong email để hoàn tất đổi mật khẩu" };
  }

  @Post("/verify-change-password")
  async verifyChangePassword(@Body() body: VerifyChangePasswordDto) {
    const email = body.email.trim().toLowerCase();
    const account = await this.accountService.findAccountByEmail(email);
    const result = await this.otpService.verifyOtp(account.email, body.otp);
    this.otpService.assertOtpVerified(result);
    await this.accountService.changePassword(account, body.newPassword);
    return { message: "Đổi mật khẩu thành công" };
  }

  @Post("/forgot-password")
  @UseBefore(otpRateLimiter)
  async forgotPassword(@Body() body: ForgotPasswordEmailDto) {
    const account = await this.accountService.findAccountByEmail(
      body.email.trim().toLowerCase(),
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
  async createAccount(@Body() body: CreateAccountDto) {
    return await this.accountService.createAccount(
      body.email,
      body.password,
      body.name,
      body.phone,
      body.roleSlug,
    );
  }

  @Patch("/update")
  @UseBefore(Auth)
  @CheckAbility("update", Account)
  async updateAccount(
    @Req() req: any,
    @BodyParam("email") email: string,
    @Body() body: UpdateAccountDto,
  ) {
    const caller = req.user as AccountDetailsDto;
    return await this.accountService.updateAccount(email, body, caller);
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
    @Body() body: UpdateAccountDto,
  ) {
    return await this.accountService.updateAdmin(email, body);
  }
}

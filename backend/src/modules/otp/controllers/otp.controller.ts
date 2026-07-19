import { Body, Controller, Get, Post, UseBefore } from "routing-controllers";
import { Service } from "typedi";
import { OtpService } from "../services/otp.service";
import { otpRateLimiter } from "@/middlewares/rateLimiter.middleware";
import { Admin } from "@/middlewares/auth.middleware";
import { parseBody } from "@/shared/validators/parse-body";
import { z } from "zod";

const otpSendSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
});

const otpVerifySchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  otp: z.string().length(6, "OTP phải có đúng 6 chữ số"),
});

@Service()
@Controller("/otp")
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Get("/active")
  @UseBefore(Admin)
  async getActiveOtp() {
    return await this.otpService.getActiveOtp();
  }

  @Post("/send")
  @UseBefore(otpRateLimiter)
  async sendOtp(@Body({ validate: false }) body: unknown) {
    const dto = parseBody(otpSendSchema, body);
    const otp = await this.otpService.sendOtp(dto.email);
    return {
      message: "OTP đã được gửi tới email của bạn",
      email: otp.email,
    };
  }

  @Post("/verify")
  async verifyOtp(@Body({ validate: false }) body: unknown) {
    const dto = parseBody(otpVerifySchema, body);
    const result = await this.otpService.verifyOtp(dto.email, dto.otp);
    this.otpService.assertOtpVerified(result);
    return { verified: true };
  }
}

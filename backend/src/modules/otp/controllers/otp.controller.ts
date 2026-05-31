import { Body, Controller, Get, Post, UseBefore } from "routing-controllers";
import { Service } from "typedi";
import { OtpService } from "../services/otp.service";
import { otpRateLimiter } from "@/middlewares/rateLimiter.middleware";
import { OtpSendDto, OtpVerifyDto } from "../dtos/otp.dto";

@Service()
@Controller("/otp")
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Get("/active")
  async getActiveOtp() {
    return await this.otpService.getActiveOtp();
  }

  @Post("/send")
  @UseBefore(otpRateLimiter)
  async sendOtp(@Body() body: OtpSendDto) {
    const otp = await this.otpService.sendOtp(body.email);
    return {
      message: "OTP đã được gửi tới email của bạn",
      email: otp.email,
    };
  }

  @Post("/verify")
  async verifyOtp(@Body() body: OtpVerifyDto) {
    const result = await this.otpService.verifyOtp(body.email, body.otp);
    this.otpService.assertOtpVerified(result);
    return { verified: true };
  }
}

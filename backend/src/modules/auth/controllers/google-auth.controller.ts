import { Body, Controller, Post, Res } from "routing-controllers";
import { Service } from "typedi";
import { Response } from "express";
import { GoogleAuthService } from "../services/google-auth.service";
import { ExchangeOAuthCodeDto } from "../dtos/google-auth.dto";
import { HttpException } from "@/shared/exceptions/http-exceptions";

@Service()
@Controller("/account/auth")
export class GoogleAuthController {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  @Post("/google/exchange")
  async exchangeOAuthCode(
    @Body() body: ExchangeOAuthCodeDto,
    @Res() res: Response
  ) {
    const tokens = this.googleAuthService.exchangeOAuthCode(body.code);

    if (!tokens) {
      throw new HttpException(401, "Code không hợp lệ hoặc đã hết hạn");
    }

    res.cookie("refreshToken", tokens.newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return { accessToken: tokens.accessToken };
  }
}

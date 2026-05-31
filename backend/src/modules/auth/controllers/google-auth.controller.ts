import { Body, Controller, Get, Post, Req, Res } from "routing-controllers";
import { Service } from "typedi";
import passport from "passport";
import { Request, Response } from "express";
import { GoogleAuthService } from "../services/google-auth.service";
import { ExchangeOAuthCodeDto, GoogleUserDto } from "../dtos/google-auth.dto";
import { HttpException } from "@/shared/exceptions/http-exceptions";

@Service()
@Controller("/account/auth")
export class GoogleAuthController {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  @Get("/google")
  googleLogin(@Req() req: Request, @Res() res: Response) {
    passport.authenticate("google", {
      scope: ["email", "profile"],
      session: false,
    })(req, res, () => {});
    return res;
  }

  @Get("/google/callback")
  googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    return new Promise<void>((resolve) => {
      passport.authenticate(
        "google",
        { session: false, failureRedirect: `${frontendUrl}/login?error=google_failed` },
        async (err: Error | null, googleUser: GoogleUserDto | false) => {
          if (err || !googleUser) {
            console.error("❌ Google OAuth error:", err?.message);
            res.redirect(`${frontendUrl}/login?error=google_failed`);
            resolve();
            return;
          }

          try {
            const result = await this.googleAuthService.googleLogin(googleUser);
            const code = this.googleAuthService.generateOAuthCode({
              accessToken: result.accessToken,
              newRefreshToken: result.newRefreshToken,
            });
            res.redirect(`${frontendUrl}/auth/callback?code=${code}`);
          } catch (loginErr) {
            console.error("❌ Google login failed:", loginErr);
            res.redirect(`${frontendUrl}/login?error=account_blocked`);
          }
          resolve();
        }
      )(req, res, () => {});
    });
  }

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

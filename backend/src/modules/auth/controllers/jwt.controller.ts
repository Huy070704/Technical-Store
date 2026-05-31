import { BodyParam, Controller, Post, Req, Res } from "routing-controllers";
import { Service } from "typedi";
import { JwtService } from "../services/jwt.service";
import { Request, Response } from "express";
import { HttpException } from "@/shared/exceptions/http-exceptions";

@Service()
@Controller("/jwt")
export class JwtController {
  constructor(private readonly jwtService: JwtService) {}

  @Post("/refresh-token")
  async refreshToken(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token not provided" });
    }

    try {
      const newAccessToken = await this.jwtService.refreshAccessToken(refreshToken);

      if (!newAccessToken) {
        res.clearCookie("refreshToken", {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
        });
        return res
          .status(401)
          .json({ message: "Invalid or expired refresh token" });
      }

      return newAccessToken;
    } catch (error) {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      });
      return res.status(401).json({ message: "Invalid refresh token" });
    }
  }

  @Post("/verify-access-token")
  async verifyAccessToken(@BodyParam("token") token: string) {
    token = token.startsWith('Bearer ') ? token.substring(7) : token;
    const result = this.jwtService.verifyAccessToken(token);
    if (!result) throw new HttpException(401, "Invalid access token");
    return result;
  }
}

import { ExpressMiddlewareInterface } from "routing-controllers";
import { Request, Response, NextFunction } from "express";
import { Service } from "typedi";
import { JwtService } from "@/modules/auth/services/jwt.service";
import { AccountDetailsDto } from "@/modules/auth/dtos/account.dto";
import { HttpException } from "@/shared/exceptions/http-exceptions";
import { HttpMessages } from "@/shared/exceptions/http-messages.constant";
import { Account } from "@/modules/auth/account.entity";

interface RequestWithUser extends Request {
  user?: AccountDetailsDto;
}

@Service()
export class Auth implements ExpressMiddlewareInterface {
  constructor(private readonly jwtService: JwtService) {}

  async use(req: RequestWithUser, res: Response, next: NextFunction): Promise<any> {
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return next(new HttpException(401, HttpMessages._UNAUTHORIZED));
    }

    // Extract token from "Bearer [token]" format
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    try {
      const payload = this.jwtService.verifyAccessToken(
        token
      ) as AccountDetailsDto | null;
      if (!payload) {
        return next(new HttpException(401, HttpMessages._UNAUTHORIZED));
      }

      // Check if user is blocked in the database
      const account = await Account.findOne({ where: { id: payload.accountId } });
      if (!account || account.isBlocked) {
        return next(new HttpException(403, "Tài khoản của bạn đã bị khóa."));
      }

      req.user = payload;
      return next();
    } catch (err) {
      console.error("JWT verification error:", err);
      return next(new HttpException(401, HttpMessages._UNAUTHORIZED));
    }
  }
}

@Service()
export class Admin implements ExpressMiddlewareInterface {
  constructor(private readonly jwtService: JwtService) {}

  async use(req: RequestWithUser, res: Response, next: NextFunction): Promise<any> {
    const authHeader = req.header("Authorization");

    let user: AccountDetailsDto;

    if (!authHeader) {
      return next(new HttpException(401, HttpMessages._UNAUTHORIZED));
    }

    // Extract token from "Bearer [token]" format
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    try {
      user = this.jwtService.verifyAccessToken(token) as AccountDetailsDto;
      if (!user) {
        return next(new HttpException(401, HttpMessages._UNAUTHORIZED));
      }

      // Check if admin is blocked in the database
      const account = await Account.findOne({ where: { id: user.accountId } });
      if (!account || account.isBlocked) {
        return next(new HttpException(403, "Tài khoản của bạn đã bị khóa."));
      }

      req.user = user;
    } catch (err) {
      console.error("JWT verification error:", err);
      return next(new HttpException(401, HttpMessages._UNAUTHORIZED));
    }

    if (!user || !user.role || !user.role.name) {
      return next(new HttpException(403, "Forbidden"));
    }
    if (user.role.name !== "admin") {
      return next(new HttpException(403, "Forbidden"));
    }
    return next();
  }
}

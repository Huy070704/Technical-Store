import { ExpressMiddlewareInterface } from "routing-controllers";
import { Request, Response, NextFunction } from "express";
import { Service } from "typedi";
import { JwtService } from "@/modules/auth/services/jwt.service";
import { AccountDetailsDto } from "@/modules/auth/account.types";
import { HttpException } from "@/shared/exceptions/http-exceptions";
import { HttpMessages } from "@/shared/exceptions/http-messages.constant";
import { Account } from "../modules/auth/models/account.model";

interface RequestWithUser extends Request {
  user?: AccountDetailsDto;
}

/**
 * Trích role đã populate từ Account (DB) thành RolePayload.
 * Dùng để đồng bộ role LIVE từ DB thay vì tin role nhúng trong JWT (có thể cũ tới 1 ngày).
 */
function toRolePayload(account: any): AccountDetailsDto["role"] | undefined {
  const role = account?.role;
  if (role && typeof role === "object") {
    return {
      id: role.id ?? role._id?.toString(),
      name: role.name,
      slug: role.slug,
    };
  }
  return undefined;
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
      const account = await Account.findById(payload.accountId).populate("role");
      if (!account || account.isBlocked) {
        return next(new HttpException(403, "Tài khoản của bạn đã bị khóa."));
      }

      // Đồng bộ role LIVE từ DB (đổi role/khóa có hiệu lực ngay, không chờ token hết hạn).
      const liveRole = toRolePayload(account);
      if (liveRole) payload.role = liveRole;

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
      const account = await Account.findById(user.accountId).populate("role");
      if (!account || account.isBlocked) {
        return next(new HttpException(403, "Tài khoản của bạn đã bị khóa."));
      }

      // Đồng bộ role LIVE từ DB (đổi role có hiệu lực ngay).
      const liveRole = toRolePayload(account);
      if (liveRole) user.role = liveRole;

      req.user = user;
    } catch (err) {
      console.error("JWT verification error:", err);
      return next(new HttpException(401, HttpMessages._UNAUTHORIZED));
    }

    if (!user?.role?.slug) {
      return next(new HttpException(403, "Forbidden"));
    }
    if (user.role.slug !== "admin") {
      return next(new HttpException(403, "Forbidden"));
    }
    return next();
  }
}

@Service()
export class Manager implements ExpressMiddlewareInterface {
  constructor(private readonly jwtService: JwtService) {}

  async use(req: RequestWithUser, res: Response, next: NextFunction): Promise<any> {
    const authHeader = req.header("Authorization");

    let user: AccountDetailsDto;

    if (!authHeader) {
      return next(new HttpException(401, HttpMessages._UNAUTHORIZED));
    }

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader;

    try {
      user = this.jwtService.verifyAccessToken(token) as AccountDetailsDto;
      if (!user) {
        return next(new HttpException(401, HttpMessages._UNAUTHORIZED));
      }

      const account = await Account.findById(user.accountId).populate("role");
      if (!account || account.isBlocked) {
        return next(new HttpException(403, "Tài khoản của bạn đã bị khóa."));
      }

      // Đồng bộ role LIVE từ DB (đổi role có hiệu lực ngay).
      const liveRole = toRolePayload(account);
      if (liveRole) user.role = liveRole;

      req.user = user;
    } catch (err) {
      console.error("JWT verification error:", err);
      return next(new HttpException(401, HttpMessages._UNAUTHORIZED));
    }

    if (!user?.role?.slug || user.role.slug !== "manager") {
      return next(new HttpException(403, "Forbidden"));
    }
    return next();
  }
}

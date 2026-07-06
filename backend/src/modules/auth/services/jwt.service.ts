import { Service } from "typedi";
import { AccountDetailsDto } from "../account.types";
import { randomUUID } from "crypto";
import jwt, { JwtPayload } from "jsonwebtoken";
import { RefreshToken } from "../models/refreshToken.model";
import { Account } from "../models/account.model";
import { AccountNotFoundException } from "@/shared/exceptions/http-exceptions";
import type { AccountDocument } from "../models/account.model";
import type { RefreshTokenDocument } from "../models/refreshToken.model";

const JWT_SECRET =
  process.env.JWT_SECRET || "default-dev-jwt-secret-change-in-production";
const REFRESH_TOKEN_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  process.env.REFRESH_TOKEN_SECRET ||
  "default-dev-refresh-secret-change-in-production";

if (
  !process.env.JWT_SECRET ||
  (!process.env.JWT_REFRESH_SECRET && !process.env.REFRESH_TOKEN_SECRET)
) {
  console.warn(
    "⚠️  WARNING: Using default JWT secrets. Set JWT_SECRET and JWT_REFRESH_SECRET in production!"
  );
}

@Service()
export class JwtService {
  private accountToPayload(account: AccountDocument): AccountDetailsDto {
    return {
      accountId: account.id,
      email: account.email,
      phone: account.phone ?? undefined,
      role: account.role as any,
      facilityId: account.facility ? account.facility.toString() : null,
    };
  }

  generateAccessToken(account: AccountDocument): string {
    const payload = this.accountToPayload(account);
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
  }

  async generateRefreshToken(account: AccountDocument): Promise<string> {
    const payload = this.accountToPayload(account);
    // jwtid (jti) đảm bảo mỗi lần đăng nhập sinh token DUY NHẤT, kể cả cùng giây
    // (nếu không, 2 lần đăng nhập cùng payload+iat sẽ ra token trùng → E11000 trên unique index token).
    const token = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
      jwtid: randomUUID(),
    });

    // Mỗi thiết bị giữ refresh token riêng: KHÔNG xóa token của thiết bị khác.
    // Chỉ dọn các token đã hết hạn của account này để tránh phình dữ liệu.
    const expiredTokens = await RefreshToken.find({
      account: account._id,
      expiredAt: { $lte: new Date() },
    });
    if (expiredTokens.length > 0) {
      await RefreshToken.softRemove(expiredTokens);
    }

    const refreshToken = new RefreshToken();
    refreshToken.token = token;
    refreshToken.account = account._id;
    refreshToken.expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await refreshToken.save();
    return token;
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenDocument | null> {
    try {
      const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as {
        email: string;
      };

      const account = await Account.findOne({ email: decoded.email });
      if (!account) throw new AccountNotFoundException();

      if (account.isBlocked) return null;

      const refreshToken = await RefreshToken.findOne({
        token,
        account: account._id,
      });
      if (!refreshToken) return null;

      if (refreshToken.expiredAt < new Date()) {
        await refreshToken.softRemove();
        return null;
      }
      return refreshToken;
    } catch {
      return null;
    }
  }

  verifyAccessToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      return null;
    }
  }

  async revokeRefreshToken(token: string): Promise<RefreshTokenDocument | null> {
    const refreshToken = await this.verifyRefreshToken(token);
    if (!refreshToken) return null;
    await refreshToken.softRemove();
    return refreshToken;
  }

  async refreshAccessToken(token: string): Promise<string | null> {
    const refreshToken = await RefreshToken.findOne({ token }).populate({
      path: "account",
      populate: { path: "role" },
    });
    if (!refreshToken || refreshToken.expiredAt < new Date()) {
      if (refreshToken) await refreshToken.softRemove();
      return null;
    }
    const account = refreshToken.account as AccountDocument;
    if (account.isBlocked) {
      await refreshToken.softRemove();
      return null;
    }
    return this.generateAccessToken(account);
  }
}

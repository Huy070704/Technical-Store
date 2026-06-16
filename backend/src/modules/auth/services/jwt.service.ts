import { Service } from "typedi";
import { AccountDetailsDto } from "../dtos/account.dto";
import jwt, { JwtPayload } from "jsonwebtoken";
import { RefreshToken } from "../refreshToken.entity";
import { Account } from "../account.entity";
import { AccountNotFoundException } from "@/shared/exceptions/http-exceptions";
import type { AccountDocument } from "../account.entity";
import type { RefreshTokenDocument } from "../refreshToken.entity";

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
    };
  }

  generateAccessToken(account: AccountDocument): string {
    const payload = this.accountToPayload(account);
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
  }

  async generateRefreshToken(account: AccountDocument): Promise<string> {
    const payload = this.accountToPayload(account);
    const token = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

    const oldTokens = await RefreshToken.find({ account: account._id });
    if (oldTokens.length > 0) {
      await RefreshToken.softRemove(oldTokens);
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

  async getRefreshToken(account: AccountDocument): Promise<RefreshTokenDocument | null> {
    return await RefreshToken.findOne({ account: account._id });
  }
}

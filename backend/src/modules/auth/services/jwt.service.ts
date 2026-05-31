import { Service } from "typedi";
import { AccountDetailsDto } from "../dtos/account.dto";
import jwt, { JwtPayload } from "jsonwebtoken";
import { RefreshToken } from "../entities/refreshToken.entity";
import { Account } from "../entities/account.entity";
import { AccountNotFoundException } from "@/shared/exceptions/http-exceptions";

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
  private accountToPayload(account: Account): AccountDetailsDto {
    return {
      accountId: account.id,
      email: account.email,
      phone: account.phone ?? undefined,
      role: account.role,
    };
  }

  generateAccessToken(account: Account): string {
    const payload = this.accountToPayload(account);
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
  }

  async generateRefreshToken(account: Account): Promise<string> {
    const payload = this.accountToPayload(account);
    const token = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

    const oldTokens = await RefreshToken.find({
      where: { account: { id: account.id } },
    });
    if (oldTokens.length > 0) {
      await RefreshToken.softRemove(oldTokens);
    }

    const refreshToken = new RefreshToken();
    refreshToken.token = token;
    refreshToken.account = account;
    refreshToken.expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await refreshToken.save();
    return token;
  }

  async verifyRefreshToken(token: string): Promise<RefreshToken | null> {
    try {
      const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET) as {
        email: string;
      };

      const account = await Account.findOne({
        where: { email: decoded.email },
      });
      if (!account) throw new AccountNotFoundException();

      const refreshToken = await RefreshToken.findOne({
        where: { token, account: { id: account.id } },
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

  async revokeRefreshToken(token: string): Promise<RefreshToken | null> {
    const refreshToken = await this.verifyRefreshToken(token);
    if (!refreshToken) return null;
    await refreshToken.softRemove();
    return refreshToken;
  }

  async refreshAccessToken(token: string): Promise<string | null> {
    const refreshToken = await RefreshToken.findOne({
      where: { token },
      relations: ["account", "account.role"],
    });
    if (!refreshToken || refreshToken.expiredAt < new Date()) {
      if (refreshToken) await refreshToken.softRemove();
      return null;
    }
    return this.generateAccessToken(refreshToken.account);
  }

  async getRefreshToken(account: Account): Promise<RefreshToken | null> {
    return await RefreshToken.findOne({
      where: { account: { id: account.id } },
    });
  }
}

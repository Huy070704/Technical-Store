import { Service } from "typedi";
import { randomBytes } from "crypto";
import { Account } from "../entities/account.entity";
import { Role } from "../entities/role.entity";
import { JwtService } from "./jwt.service";
import { EntityNotFoundException } from "@/shared/exceptions/http-exceptions";
import { GoogleUserDto } from "../dtos/google-auth.dto";

interface OAuthCodeEntry {
  tokens: { accessToken: string; newRefreshToken: string };
  expiresAt: number;
}

@Service()
export class GoogleAuthService {
  private readonly oauthCodes = new Map<string, OAuthCodeEntry>();

  constructor(private readonly jwtService: JwtService) {}

  async findOrCreateGoogleAccount(googleUser: GoogleUserDto): Promise<Account> {
    const email = googleUser.email.trim().toLowerCase();

    let account = await Account.findOne({
      where: { googleId: googleUser.googleId },
      relations: ["role"],
    });
    if (account) return account;

    account = await Account.findOne({
      where: { email },
      relations: ["role"],
    });

    if (account) {
      account.googleId = googleUser.googleId;
      if (googleUser.avatar && !account.avatar) {
        account.avatar = googleUser.avatar;
      }
      await account.save();
      return account;
    }

    const customerRole = await Role.findOne({ where: { slug: "customer" } });
    if (!customerRole) {
      throw new EntityNotFoundException(
        "Role 'customer' chưa được khởi tạo. Chạy POST /api/auth/roles/create-roles trước."
      );
    }

    const newAccount = new Account();
    newAccount.email = email;
    newAccount.name = googleUser.name;
    newAccount.avatar = googleUser.avatar ?? undefined;
    newAccount.googleId = googleUser.googleId;
    newAccount.role = customerRole;
    newAccount.isRegistered = true;
    await newAccount.save();
    return newAccount;
  }

  async googleLogin(googleUser: GoogleUserDto): Promise<{
    accessToken: string;
    newRefreshToken: string;
    account: Partial<Account>;
  }> {
    const account = await this.findOrCreateGoogleAccount(googleUser);

    const newRefreshToken = await this.jwtService.generateRefreshToken(account);
    const accessToken = this.jwtService.generateAccessToken(account);

    console.log(`✅ Google login: ${account.email}`);

    return {
      accessToken,
      newRefreshToken,
      account: {
        id: account.id,
        email: account.email,
        name: account.name,
        avatar: account.avatar,
        role: account.role,
      },
    };
  }

  generateOAuthCode(tokens: {
    accessToken: string;
    newRefreshToken: string;
  }): string {
    const code = randomBytes(32).toString("hex");
    this.oauthCodes.set(code, {
      tokens,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    return code;
  }

  exchangeOAuthCode(
    code: string
  ): { accessToken: string; newRefreshToken: string } | null {
    const entry = this.oauthCodes.get(code);
    this.oauthCodes.delete(code);
    if (!entry || entry.expiresAt < Date.now()) return null;
    return entry.tokens;
  }
}

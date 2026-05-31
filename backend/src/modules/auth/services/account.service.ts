import { Service } from "typedi";
import { Account } from "../entities/account.entity";
import { Role } from "../entities/role.entity";
import {
  AccountNotFoundException,
  EntityNotFoundException,
  ForbiddenException,
  PhoneAlreadyExistedException,
  TokenNotFoundException,
  UsernameAlreadyExistedException,
} from "@/shared/exceptions/http-exceptions";
import * as bcrypt from "bcrypt";
import {
  RegisterDto,
  UpdateAccountDto,
} from "../dtos/account.dto";
import { JwtService } from "./jwt.service";
import { RefreshToken } from "../entities/refreshToken.entity";
import { MoreThan, LessThan } from "typeorm";
import { HttpMessages } from "@/shared/exceptions/http-messages.constant";
import { OtpService } from "../../otp/services/otp.service";

const SALT_ROUNDS = 8;

@Service()
export class AccountService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService
  ) {}

  async register(request: RegisterDto): Promise<Account> {
    const email = request.email.trim().toLowerCase();

    const role = await Role.findOne({ where: { slug: "customer" } });
    if (!role) {
      throw new EntityNotFoundException(
        "Role 'customer' chưa được khởi tạo. Chạy /auth/roles/create-roles trước."
      );
    }

    const existingAccount = await Account.findOne({ where: { email } });

    if (existingAccount) {
      if (existingAccount.googleId && !existingAccount.password) {
        throw new UsernameAlreadyExistedException(
          "Email này đã được đăng ký bằng Google. Vui lòng đăng nhập bằng Google."
        );
      }
      if (existingAccount.isRegistered) {
        throw new UsernameAlreadyExistedException(HttpMessages._USERNAME_EXISTED);
      }
      await existingAccount.softRemove();
    }

    const account = new Account();
    account.email = email;
    account.password = await bcrypt.hash(request.password, SALT_ROUNDS);
    account.phone = request.phone;
    account.name = request.name;
    account.role = role;
    account.isRegistered = false;

    await account.save();
    return account;
  }

  async finalizeRegistration(
    email: string,
    otp: string
  ): Promise<{ newRefreshToken: string; accessToken: string }> {
    const targetEmail = email.trim().toLowerCase();

    const verifyResult = await this.otpService.verifyOtp(targetEmail, otp);
    this.otpService.assertOtpVerified(verifyResult);

    const account = await Account.findOne({
      where: { email: targetEmail, isRegistered: false },
      relations: ["role"],
    });
    if (!account) throw new AccountNotFoundException();

    account.isRegistered = true;
    await account.save();

    const newRefreshToken = await this.jwtService.generateRefreshToken(account);
    const accessToken = this.jwtService.generateAccessToken(account);
    return { newRefreshToken, accessToken };
  }

  async removeNewAccounts(): Promise<void> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const accounts = await Account.find({
      where: { isRegistered: false, createdAt: LessThan(tenMinutesAgo) },
    });
    if (accounts.length > 0) await Account.softRemove(accounts);
  }

  async login(
    credentials: { email: string; password: string }
  ): Promise<{ newRefreshToken: string; accessToken: string }> {
    const email = credentials.email.trim().toLowerCase();

    const account = await Account.findOne({
      where: { email, isRegistered: true },
      relations: ["role"],
    });
    if (!account) throw new AccountNotFoundException();

    if (!account.password) {
      throw new AccountNotFoundException();
    }

    if (!(await bcrypt.compare(credentials.password, account.password))) {
      throw new AccountNotFoundException();
    }

    const existingToken = await RefreshToken.findOne({
      where: { account: { id: account.id }, expiredAt: MoreThan(new Date()) },
    });

    const newRefreshToken = existingToken
      ? existingToken.token
      : await this.jwtService.generateRefreshToken(account);

    const accessToken = this.jwtService.generateAccessToken(account);
    return { newRefreshToken, accessToken };
  }

  async logout(accountId: string): Promise<string> {
    const account = await Account.findOne({ where: { id: accountId } });
    if (!account) throw new AccountNotFoundException();

    const token = await this.jwtService.getRefreshToken(account);
    if (!token) throw new TokenNotFoundException();
    await token.softRemove();
    return "Logged out";
  }

  async findAccountByEmail(email: string): Promise<Account> {
    const account = await Account.findOne({
      where: { email: email.trim().toLowerCase() },
      relations: ["role"],
    });
    if (!account) throw new AccountNotFoundException();
    return account;
  }

  async findAccountById(id: string): Promise<Account> {
    const account = await Account.findOne({ where: { id }, relations: ["role"] });
    if (!account) throw new AccountNotFoundException();
    return account;
  }

  async findAccountByPhone(phone: string): Promise<Account> {
    const account = await Account.findOne({ where: { phone }, relations: ["role"] });
    if (!account) throw new AccountNotFoundException();
    return account;
  }

  async checkOldPassword(account: Account, oldPassword: string): Promise<boolean> {
    if (!account.password) return false;
    return await bcrypt.compare(oldPassword, account.password);
  }

  async changePassword(account: Account, newPassword: string): Promise<Account> {
    account.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await account.save();
    return account;
  }

  async getAccounts(): Promise<Account[]> {
    return await Account.find({ relations: ["role"] });
  }

  async createAccount(
    email: string,
    password: string,
    name: string,
    phone: string | undefined,
    roleSlug: string
  ): Promise<Account> {
    const targetEmail = email.trim().toLowerCase();

    const role = await Role.findOne({ where: { slug: roleSlug } });
    if (!role) throw new EntityNotFoundException("Role");

    if (role.slug === "admin") {
      throw new ForbiddenException("Không được phép tạo tài khoản admin.");
    }

    const checkEmail = await Account.findOne({ where: { email: targetEmail } });
    if (checkEmail) {
      throw new UsernameAlreadyExistedException(HttpMessages._USERNAME_EXISTED);
    }

    if (phone) {
      const checkPhone = await Account.findOne({ where: { phone } });
      if (checkPhone) {
        throw new PhoneAlreadyExistedException(HttpMessages._PHONE_EXISTED);
      }
    }

    const account = new Account();
    account.email = targetEmail;
    account.password = await bcrypt.hash(password, SALT_ROUNDS);
    account.phone = phone;
    account.name = name;
    account.role = role;
    account.isRegistered = true;
    await account.save();
    return account;
  }

  async updateAccount(email: string, request: UpdateAccountDto): Promise<Account> {
    const account = await this.findAccountByEmail(email);
    if (request.email) account.email = request.email.trim().toLowerCase();
    if (request.phone) account.phone = request.phone;
    if (request.name) account.name = request.name;
    if (request.roleSlug) {
      const role = await Role.findOne({ where: { slug: request.roleSlug } });
      if (!role) throw new EntityNotFoundException("Role");
      if (role.slug === "admin") {
        throw new ForbiddenException("Không được phép đổi sang role admin.");
      }
      account.role = role;
    }
    await account.save();
    return account;
  }

  async deleteAccount(email: string): Promise<Account> {
    const account = await this.findAccountByEmail(email);
    if (account.role.slug === "admin") {
      throw new ForbiddenException("Không được phép xóa tài khoản admin.");
    }
    await account.softRemove();
    return account;
  }

  async updateAdmin(email: string, request: UpdateAccountDto): Promise<Account> {
    const account = await this.findAccountByEmail(email);
    if (account.role.slug !== "admin") {
      throw new ForbiddenException("Đây không phải tài khoản admin.");
    }
    if (request.email) account.email = request.email.trim().toLowerCase();
    if (request.phone) account.phone = request.phone;
    if (request.name) account.name = request.name;
    await account.save();
    return account;
  }
}

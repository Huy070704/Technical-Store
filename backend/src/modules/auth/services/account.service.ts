import { Service } from "typedi";
import { Account } from "../models/account.model";
import { Role } from "../models/role.model";
import { Facility } from "../../facility/models/facility.model";
import {
  AccountNotFoundException,
  EntityNotFoundException,
  ForbiddenException,
  PhoneAlreadyExistedException,
  TokenNotFoundException,
  UsernameAlreadyExistedException,
} from "@/shared/exceptions/http-exceptions";
import * as bcrypt from "bcrypt";
import { AccountDetailsDto } from "../account.types";

interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

interface UpdateAccountDto {
  email?: string;
  phone?: string;
  name?: string;
  roleSlug?: string;
  isBlocked?: boolean;
  facilityId?: string | null;
}
import { JwtService } from "./jwt.service";
import { RefreshToken } from "../models/refreshToken.model";
import { HttpMessages } from "@/shared/exceptions/http-messages.constant";
import { OtpService } from "../../otp/services/otp.service";
import type { AccountDocument } from "../models/account.model";

const SALT_ROUNDS = 8;

@Service()
export class AccountService {
  constructor(
    private readonly jwtService: JwtService, // chỉ gán giá trị 1 lần và không thay đổi
    private readonly otpService: OtpService
  ) {}

  async register(request: RegisterDto): Promise<AccountDocument> {
    const email = request.email.trim().toLowerCase();

    const role = await Role.findOne({ slug: "customer" });
    if (!role) {
      throw new EntityNotFoundException(
        "Role 'customer' chưa được khởi tạo. Chạy /auth/roles/create-roles trước."
      );
    }

    const existingAccount = await Account.findOne({ email });

    if (existingAccount) {
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
      email: targetEmail,
      isRegistered: false,
    }).populate("role");
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
      isRegistered: false,
      createdAt: { $lt: tenMinutesAgo },
    });
    if (accounts.length > 0) await Account.softRemove(accounts);
  }

  async login(
    credentials: { email: string; password: string }
  ): Promise<{ newRefreshToken: string; accessToken: string }> {
    const email = credentials.email.trim().toLowerCase();

    const account = await Account.findOne({
      email,
      isRegistered: true,
    }).populate("role");
    if (!account) throw new AccountNotFoundException();

    if (account.isBlocked) {
      throw new ForbiddenException("Tài khoản của bạn đã bị khóa.");
    }

    if (!account.password) {
      throw new AccountNotFoundException();
    }

    if (!(await bcrypt.compare(credentials.password, account.password))) {
      throw new AccountNotFoundException();
    }

    const existingToken = await RefreshToken.findOne({
      account: account._id,
      expiredAt: { $gt: new Date() },
    });

    const newRefreshToken = existingToken
      ? existingToken.token
      : await this.jwtService.generateRefreshToken(account);

    const accessToken = this.jwtService.generateAccessToken(account);
    return { newRefreshToken, accessToken };
  }

  async logout(accountId: string): Promise<string> {
    const account = await Account.findById(accountId);
    if (!account) throw new AccountNotFoundException();

    const token = await this.jwtService.getRefreshToken(account);
    if (!token) throw new TokenNotFoundException();
    await token.softRemove();
    return "Logged out";
  }

  async findAccountByEmail(email: string): Promise<AccountDocument> {
    const account = await Account.findOne({
      email: email.trim().toLowerCase(),
    }).populate("role");
    if (!account) throw new AccountNotFoundException();
    return account;
  }

  async findAccountById(id: string): Promise<AccountDocument> {
    const account = await Account.findById(id).populate("role");
    if (!account) throw new AccountNotFoundException();
    return account;
  }

  async findAccountByPhone(phone: string): Promise<AccountDocument> {
    const account = await Account.findOne({ phone }).populate("role");
    if (!account) throw new AccountNotFoundException();
    return account;
  }

  async checkOldPassword(account: AccountDocument, oldPassword: string): Promise<boolean> {
    if (!account.password) return false;
    return await bcrypt.compare(oldPassword, account.password);
  }

  async changePassword(account: AccountDocument, newPassword: string): Promise<AccountDocument> {
    account.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await account.save();
    return account;
  }

  async getAccounts(): Promise<AccountDocument[]> {
    return await Account.find().populate("role").populate("facility", "name");
  }

  async createAccount(
    email: string,
    password: string,
    name: string,
    phone: string | undefined,
    roleSlug: string
  ): Promise<AccountDocument> {
    const targetEmail = email.trim().toLowerCase();

    const role = await Role.findOne({ slug: roleSlug });
    if (!role) throw new EntityNotFoundException("Role");

    if (role.slug === "admin") {
      throw new ForbiddenException("Không được phép tạo tài khoản admin.");
    }

    const checkEmail = await Account.findOne({ email: targetEmail });
    if (checkEmail) {
      throw new UsernameAlreadyExistedException(HttpMessages._USERNAME_EXISTED);
    }

    if (phone) {
      const checkPhone = await Account.findOne({ phone });
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

  async updateAccount(email: string, request: UpdateAccountDto, caller?: AccountDetailsDto): Promise<AccountDocument> {
    const account = await this.findAccountByEmail(email);

    // Trạng thái trước khi cập nhật (để đồng bộ quản lý cơ sở sau đó).
    const prevFacilityId = account.facility ? account.facility.toString() : null;
    const prevRoleSlug = (account.role as any)?.slug ?? null;

    if (caller) {
      const callerRoleSlug = typeof caller.role === "string" ? caller.role : (caller.role as any)?.slug;
      const targetRoleSlug = (account.role as any)?.slug;

      // Admin cannot edit/block other admins
      if (targetRoleSlug === "admin" && caller.email !== account.email) {
        throw new ForbiddenException("Không được phép chỉnh sửa hoặc khóa tài khoản admin khác.");
      }

      // Non-admin cannot edit/block admin
      if (callerRoleSlug !== "admin" && targetRoleSlug === "admin") {
        throw new ForbiddenException("Không được phép chỉnh sửa hoặc khóa tài khoản admin.");
      }
    }

    if (request.email) account.email = request.email.trim().toLowerCase();
    if (request.phone) account.phone = request.phone;
    if (request.name) account.name = request.name;
    if (request.roleSlug) {
      const role = await Role.findOne({ slug: request.roleSlug });
      if (!role) throw new EntityNotFoundException("Role");
      if (role.slug === "admin") {
        throw new ForbiddenException("Không được phép đổi sang role admin.");
      }
      account.role = role;
    }

    if (typeof request.isBlocked === "boolean") {
      account.isBlocked = request.isBlocked;
      if (request.isBlocked) {
        // Sign out immediately by removing refresh tokens
        const oldTokens = await RefreshToken.find({ account: account._id });
        if (oldTokens.length > 0) {
          await RefreshToken.softRemove(oldTokens);
        }
      }
    }

    // Phân công / chuyển nhân viên về cơ sở. null hoặc "" = gỡ khỏi cơ sở.
    if (request.facilityId !== undefined) {
      if (request.facilityId) {
        const facility = await Facility.findById(request.facilityId);
        if (!facility) throw new EntityNotFoundException("Facility");
        account.facility = facility._id;
      } else {
        account.facility = null;
      }
    }

    await account.save();

    // Đồng bộ quản lý cơ sở: tài khoản role=manager là quản lý của cơ sở mà nó thuộc về.
    await this.syncFacilityManager(account, prevFacilityId, prevRoleSlug);

    return account;
  }

  /**
   * Giữ Facility.manager nhất quán với Account (role=manager + facility).
   * - Gỡ quản lý khỏi cơ sở cũ nếu đổi cơ sở hoặc không còn là manager.
   * - Đặt làm quản lý cơ sở mới nếu role=manager và đã thuộc cơ sở.
   */
  private async syncFacilityManager(
    account: AccountDocument,
    prevFacilityId: string | null,
    prevRoleSlug: string | null
  ): Promise<void> {
    const newFacilityId = account.facility ? account.facility.toString() : null;
    const newRoleSlug = (account.role as any)?.slug ?? null;
    const accountId = account._id.toString();

    // Trước đây là quản lý của cơ sở cũ, nay rời đi hoặc thôi làm manager → gỡ.
    if (
      prevFacilityId &&
      prevRoleSlug === "manager" &&
      (newRoleSlug !== "manager" || newFacilityId !== prevFacilityId)
    ) {
      const prevFacility = await Facility.findById(prevFacilityId);
      if (prevFacility && prevFacility.manager?.toString() === accountId) {
        prevFacility.manager = null;
        await prevFacility.save();
      }
    }

    // Hiện là manager và đã thuộc một cơ sở → đặt làm quản lý cơ sở đó.
    if (newFacilityId && newRoleSlug === "manager") {
      const newFacility = await Facility.findById(newFacilityId);
      if (newFacility && newFacility.manager?.toString() !== accountId) {
        newFacility.manager = account._id;
        await newFacility.save();
      }
    }
  }

  async deleteAccount(email: string): Promise<AccountDocument> {
    const account = await this.findAccountByEmail(email);
    if ((account.role as any).slug === "admin") {
      throw new ForbiddenException("Không được phép xóa tài khoản admin.");
    }
    await account.softRemove();
    return account;
  }

  async updateAdmin(email: string, request: UpdateAccountDto): Promise<AccountDocument> {
    const account = await this.findAccountByEmail(email);
    if ((account.role as any).slug !== "admin") {
      throw new ForbiddenException("Đây không phải tài khoản admin.");
    }
    if (request.email) account.email = request.email.trim().toLowerCase();
    if (request.phone) account.phone = request.phone;
    if (request.name) account.name = request.name;
    await account.save();
    return account;
  }
}

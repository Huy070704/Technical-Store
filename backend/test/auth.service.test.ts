import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import bcrypt from "bcrypt";
import { Account } from "../src/modules/auth/models/account.model";
import { RefreshToken } from "../src/modules/auth/models/refreshToken.model";
import { Role } from "../src/modules/auth/models/role.model";
import { AccountService } from "../src/modules/auth/services/account.service";
import { JwtService } from "../src/modules/auth/services/jwt.service";
import {
  ForbiddenException,
  UsernameAlreadyExistedException,
  ValidationException,
} from "../src/shared/exceptions/http-exceptions";

const queryResult = <T>(value: T) => {
  const query: any = {
    populate() {
      return query;
    },
    select() {
      return query;
    },
    sort() {
      return query;
    },
    session() {
      return query;
    },
    then(resolve: (result: T) => unknown, reject: (error: unknown) => unknown) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
  return query;
};

describe("Auth - AccountService", () => {
  const originalRoleFindOne = Role.findOne;
  const originalAccountFindOne = Account.findOne;
  const originalAccountSave = Account.prototype.save;
  const originalRefreshFind = RefreshToken.find;
  const originalRefreshFindOne = RefreshToken.findOne;
  const originalRefreshSoftRemove = RefreshToken.softRemove;

  let issuedRefreshFor: string[];
  let issuedAccessFor: string[];
  let invalidatedOtps: Array<{ email: string; otp: string }>;
  let otpResult: "valid" | "expired" | "invalid";

  const jwtMock = {
    async generateRefreshToken(account: any) {
      issuedRefreshFor.push(account.email);
      return "refresh-token";
    },
    generateAccessToken(account: any) {
      issuedAccessFor.push(account.email);
      return "access-token";
    },
  };

  const otpMock = {
    async verifyOtp() {
      return otpResult;
    },
    assertOtpVerified(result: string) {
      if (result !== "valid") {
        throw new ValidationException("OTP invalid", "OTP không hợp lệ");
      }
    },
    async invalidateOtp(email: string, otp: string) {
      invalidatedOtps.push({ email, otp });
    },
  };

  beforeEach(() => {
    issuedRefreshFor = [];
    issuedAccessFor = [];
    invalidatedOtps = [];
    otpResult = "valid";
  });

  afterEach(() => {
    Role.findOne = originalRoleFindOne;
    Account.findOne = originalAccountFindOne;
    Account.prototype.save = originalAccountSave;
    RefreshToken.find = originalRefreshFind;
    RefreshToken.findOne = originalRefreshFindOne;
    RefreshToken.softRemove = originalRefreshSoftRemove;
  });

  it("đăng ký customer: chuẩn hóa email/username và hash mật khẩu", async () => {
    const customerRole = new Role({ name: "customer", slug: "customer" });
    Role.findOne = ((async (filter: any) => {
      assert.equal(filter.slug, "customer");
      return customerRole;
    }) as unknown) as typeof Role.findOne;

    Account.findOne = ((async () => null) as unknown) as typeof Account.findOne;
    let savedAccount: any;
    Account.prototype.save = (async function (this: any) {
      savedAccount = this;
      return this;
    }) as typeof Account.prototype.save;

    const service = new AccountService(jwtMock as never, otpMock as never);
    const account = await service.register({
      email: "  Customer@Example.COM ",
      password: "Secret123",
      name: "  TestUser  ",
      phone: "0912345678",
    });

    assert.equal(account, savedAccount);
    assert.equal(account.email, "customer@example.com");
    assert.equal(account.username, "testuser");
    assert.equal(account.name, "TestUser");
    assert.equal(account.isRegistered, false);
    assert.equal((account.role as any).slug, "customer");
    assert.equal(await bcrypt.compare("Secret123", account.password!), true);
  });

  it("từ chối đăng ký khi email đã thuộc account hoàn tất", async () => {
    Role.findOne = ((async () => new Role({ name: "customer", slug: "customer" })) as unknown) as typeof Role.findOne;
    Account.findOne = ((async () => ({ isRegistered: true })) as unknown) as typeof Account.findOne;
    const service = new AccountService(jwtMock as never, otpMock as never);

    await assert.rejects(
      () => service.register({ email: "used@example.com", password: "Secret123", name: "used" }),
      (error: unknown) => error instanceof UsernameAlreadyExistedException,
    );
  });

  it("xác minh đăng ký: kích hoạt account, consume OTP và cấp đủ token", async () => {
    const account = new Account({
      email: "new@example.com",
      name: "new-user",
      isRegistered: false,
      role: new Role({ name: "customer", slug: "customer" }),
    });
    let saveCalls = 0;
    account.save = async function () {
      saveCalls += 1;
      return this;
    } as any;
    Account.findOne = ((() => queryResult(account)) as unknown) as typeof Account.findOne;

    const service = new AccountService(jwtMock as never, otpMock as never);
    const result = await service.finalizeRegistration(" NEW@EXAMPLE.COM ", "123456");

    assert.equal(account.isRegistered, true);
    assert.equal(saveCalls, 1);
    assert.deepEqual(result, {
      newRefreshToken: "refresh-token",
      accessToken: "access-token",
    });
    assert.deepEqual(invalidatedOtps, [{ email: "new@example.com", otp: "123456" }]);
    assert.deepEqual(issuedRefreshFor, ["new@example.com"]);
    assert.deepEqual(issuedAccessFor, ["new@example.com"]);
  });

  it("không kích hoạt account khi OTP sai", async () => {
    otpResult = "invalid";
    let accountQueried = false;
    Account.findOne = ((() => {
      accountQueried = true;
      return queryResult(null);
    }) as unknown) as typeof Account.findOne;
    const service = new AccountService(jwtMock as never, otpMock as never);

    await assert.rejects(
      () => service.finalizeRegistration("new@example.com", "000000"),
      (error: unknown) => error instanceof ValidationException,
    );
    assert.equal(accountQueried, false);
    assert.equal(issuedAccessFor.length, 0);
  });

  it("đăng nhập bằng username và cấp access/refresh token", async () => {
    const password = await bcrypt.hash("Secret123", 4);
    const account = new Account({
      email: "member@example.com",
      username: "member",
      password,
      isRegistered: true,
      isBlocked: false,
      role: new Role({ name: "customer", slug: "customer" }),
    });
    let capturedFilter: any;
    Account.findOne = (((filter: any) => {
      capturedFilter = filter;
      return queryResult(account);
    }) as unknown) as typeof Account.findOne;

    const service = new AccountService(jwtMock as never, otpMock as never);
    const tokens = await service.login({ identifier: " MEMBER ", password: "Secret123" });

    assert.equal(capturedFilter.isRegistered, true);
    assert.deepEqual(capturedFilter.$or, [
      { email: "member" },
      { username: "member" },
    ]);
    assert.deepEqual(tokens, {
      newRefreshToken: "refresh-token",
      accessToken: "access-token",
    });
  });

  it("từ chối đăng nhập account bị khóa", async () => {
    const account = new Account({
      email: "blocked@example.com",
      password: await bcrypt.hash("Secret123", 4),
      isRegistered: true,
      isBlocked: true,
      role: new Role({ name: "customer", slug: "customer" }),
    });
    Account.findOne = ((() => queryResult(account)) as unknown) as typeof Account.findOne;
    const service = new AccountService(jwtMock as never, otpMock as never);

    await assert.rejects(
      () => service.login({ identifier: "blocked@example.com", password: "Secret123" }),
      (error: unknown) => error instanceof ForbiddenException,
    );
    assert.equal(issuedRefreshFor.length, 0);
  });

  it("đổi mật khẩu sẽ hash mật khẩu mới và thu hồi mọi refresh token", async () => {
    const account = new Account({
      email: "member@example.com",
      password: await bcrypt.hash("OldSecret1", 4),
    });
    account.save = (async function () {
      return this;
    }) as any;
    const oldTokens = [{ _id: "token-1" }, { _id: "token-2" }];
    RefreshToken.find = ((async () => oldTokens) as unknown) as typeof RefreshToken.find;
    let revoked: unknown;
    RefreshToken.softRemove = ((async (tokens: unknown) => {
      revoked = tokens;
      return tokens;
    }) as unknown) as typeof RefreshToken.softRemove;

    const service = new AccountService(jwtMock as never, otpMock as never);
    await service.changePassword(account, "NewSecret2");

    assert.equal(await bcrypt.compare("NewSecret2", account.password!), true);
    assert.equal(await bcrypt.compare("OldSecret1", account.password!), false);
    assert.equal(revoked, oldTokens);
  });

  it("logout chỉ thu hồi refresh token của thiết bị hiện tại", async () => {
    const account = new Account({ email: "member@example.com" });
    Account.findOne = originalAccountFindOne;
    const originalFindById = Account.findById;
    const token = { softRemoveCalls: 0, async softRemove() { this.softRemoveCalls += 1; } };
    Account.findById = ((async () => account) as unknown) as typeof Account.findById;
    RefreshToken.findOne = ((async () => token) as unknown) as typeof RefreshToken.findOne;

    try {
      const service = new AccountService(jwtMock as never, otpMock as never);
      const result = await service.logout(account.id, "device-refresh-token");
      assert.equal(result, "Logged out");
      assert.equal(token.softRemoveCalls, 1);
    } finally {
      Account.findById = originalFindById;
    }
  });

  it("Admin - createAccount từ chối tạo tài khoản admin", async () => {
    const adminRole = new Role({ name: "admin", slug: "admin" });
    Role.findOne = ((async () => adminRole) as unknown) as typeof Role.findOne;
    const service = new AccountService(jwtMock as never, otpMock as never);
    await assert.rejects(
      () => service.createAccount("test@admin.com", "123", "Test", undefined, "admin"),
      (error: unknown) => error instanceof ForbiddenException
    );
  });

  it("Admin - deleteAccount chặn xóa tài khoản admin", async () => {
    const mockAccount = {
      email: "admin@example.com",
      role: { slug: "admin" },
      softRemove: async () => {}
    };
    Account.findOne = ((() => queryResult(mockAccount)) as unknown) as typeof Account.findOne;
    const service = new AccountService(jwtMock as never, otpMock as never);
    await assert.rejects(
      () => service.deleteAccount("admin@example.com"),
      (error: unknown) => error instanceof ForbiddenException
    );
  });
});

describe("Auth - JwtService", () => {
  it("access token chứa đúng account và verify token sai trả null", () => {
    const role = new Role({ name: "customer", slug: "customer" });
    const account = new Account({
      email: "jwt@example.com",
      phone: "0912345678",
      role,
    });
    const service = new JwtService();

    const token = service.generateAccessToken(account);
    const payload = service.verifyAccessToken(token);

    assert.equal(payload?.accountId, account.id);
    assert.equal(payload?.email, "jwt@example.com");
    assert.equal(service.verifyAccessToken("not-a-jwt"), null);
  });
});

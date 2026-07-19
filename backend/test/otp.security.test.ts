import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { Types } from "mongoose";
import { getMetadataArgsStorage } from "routing-controllers";
import { Admin } from "../src/middlewares/auth.middleware";
import { OtpController } from "../src/modules/otp/controllers/otp.controller";
import { Otp } from "../src/modules/otp/models/otp.model";
import { OtpService } from "../src/modules/otp/services/otp.service";

describe("OTP endpoint security", () => {
  const originalDeleteMany = Otp.deleteMany;
  const originalFind = Otp.find;

  afterEach(() => {
    Otp.deleteMany = originalDeleteMany;
    Otp.find = originalFind;
  });

  it("GET /otp/active is protected by the Admin middleware", () => {
    const guardMetadata = getMetadataArgsStorage().uses.find(
      (metadata) =>
        metadata.target === OtpController &&
        metadata.method === "getActiveOtp" &&
        metadata.middleware === Admin &&
        metadata.afterAction === false
    );

    assert.ok(
      guardMetadata,
      "getActiveOtp must require the Admin middleware before the action"
    );
  });

  it("only returns allow-listed metadata and never exposes code/account", async () => {
    let deleteFilter: unknown;
    let selectedFields: unknown;
    let sortFields: unknown;

    Otp.deleteMany = ((async (filter: unknown) => {
      deleteFilter = filter;
      return { acknowledged: true, deletedCount: 0 };
    }) as unknown) as typeof Otp.deleteMany;

    const query: any = {
      select(fields: unknown) {
        selectedFields = fields;
        return query;
      },
      sort(fields: unknown) {
        sortFields = fields;
        return query;
      },
      async lean() {
        return [
          {
            _id: new Types.ObjectId("64b000000000000000000001"),
            email: "guest@example.com",
            code: "123456",
            account: new Types.ObjectId("64b000000000000000000002"),
            verified: false,
            expiresAt: new Date("2030-01-01T00:00:00.000Z"),
            createdAt: new Date("2029-12-31T23:55:00.000Z"),
            updatedAt: new Date("2029-12-31T23:55:00.000Z"),
          },
        ];
      },
    };

    Otp.find = ((() => query) as unknown) as typeof Otp.find;

    const result = await new OtpService().getActiveOtp();

    assert.deepEqual(selectedFields, "email verified expiresAt createdAt updatedAt");
    assert.deepEqual(sortFields, { createdAt: -1 });
    assert.ok((deleteFilter as any).expiresAt.$lt instanceof Date);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "64b000000000000000000001");
    assert.equal(result[0].email, "guest@example.com");
    assert.equal("code" in result[0], false);
    assert.equal("account" in result[0], false);
  });
});

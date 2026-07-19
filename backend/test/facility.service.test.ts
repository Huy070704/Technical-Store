import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { Types } from "mongoose";
import { Facility } from "../src/modules/facility/models/facility.model";
import { Account } from "../src/modules/auth/models/account.model";
import { FacilityService } from "../src/modules/facility/services/facility.service";
import { EntityNotFoundException } from "../src/shared/exceptions/http-exceptions";

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
    then(resolve: (result: T) => unknown, reject: (error: unknown) => unknown) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
  return query;
};

describe("Admin - FacilityService", () => {
  const originalFacilityFind = Facility.find;
  const originalFacilityFindById = Facility.findById;
  const originalFacilitySave = Facility.prototype.save;
  const originalAccountAggregate = Account.aggregate;
  const originalAccountFind = Account.find;
  const originalAccountUpdateMany = Account.updateMany;

  afterEach(() => {
    Facility.find = originalFacilityFind;
    Facility.findById = originalFacilityFindById;
    Facility.prototype.save = originalFacilitySave;
    Account.aggregate = originalAccountAggregate;
    Account.find = originalAccountFind;
    Account.updateMany = originalAccountUpdateMany;
  });

  it("getFacilities - trả về danh sách cơ sở cùng số lượng nhân viên", async () => {
    const fId1 = new Types.ObjectId();
    const fId2 = new Types.ObjectId();

    const mockFacilities = [
      {
        _id: fId1,
        name: "Cơ sở 1",
        isActive: true,
        manager: { _id: new Types.ObjectId(), name: "Quản lý 1" },
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: fId2,
        name: "Cơ sở 2",
        isActive: false,
        manager: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const mockAggregates = [
      { _id: fId1, count: 5 },
      { _id: fId2, count: 0 },
    ];

    Facility.find = (() => queryResult(mockFacilities)) as unknown as typeof Facility.find;
    Account.aggregate = (async () => mockAggregates) as unknown as typeof Account.aggregate;

    const service = new FacilityService();
    const result = await service.getFacilities();

    assert.equal(result.summary.total, 2);
    assert.equal(result.summary.active, 1);
    assert.equal(result.summary.inactive, 1);
    assert.equal(result.summary.assignedStaff, 5);

    assert.equal(result.facilities.length, 2);
    assert.equal(result.facilities[0].name, "Cơ sở 1");
    assert.equal(result.facilities[0].staffCount, 5);
    assert.equal(result.facilities[1].staffCount, 0);
  });

  it("getFacilityById - ném lỗi nếu cơ sở không tồn tại", async () => {
    Facility.findById = (() => queryResult(null)) as unknown as typeof Facility.findById;

    const service = new FacilityService();
    await assert.rejects(
      () => service.getFacilityById(new Types.ObjectId().toString()),
      (error: unknown) => error instanceof EntityNotFoundException
    );
  });

  it("updateFacility - cập nhật thông tin cơ sở", async () => {
    const facilityId = new Types.ObjectId();
    const mockFacility = new Facility({
      _id: facilityId,
      name: "Old Name",
    });

    let saved = false;
    mockFacility.save = async function () {
      saved = true;
      return this;
    } as any;

    Facility.findById = (() => queryResult(mockFacility)) as unknown as typeof Facility.findById;
    Account.find = (() => queryResult([])) as unknown as typeof Account.find;

    const service = new FacilityService();
    const updated = await service.updateFacility(facilityId.toString(), {
      name: "New Name",
      phone: "123456789",
    });

    assert.equal(saved, true);
    assert.equal(mockFacility.name, "New Name");
    assert.equal(mockFacility.phone, "123456789");
    assert.equal(updated.name, "New Name");
  });

  it("setActive - khóa cơ sở và gỡ bỏ nhân viên khỏi cơ sở", async () => {
    const facilityId = new Types.ObjectId();
    const managerId = new Types.ObjectId();
    const mockFacility = new Facility({
      _id: facilityId,
      isActive: true,
      manager: managerId,
    });

    let saved = false;
    mockFacility.save = async function () {
      saved = true;
      return this;
    } as any;

    let updateManyFilter: any;
    let updateManyOp: any;

    Facility.findById = (() => queryResult(mockFacility)) as unknown as typeof Facility.findById;
    Account.find = (() => queryResult([])) as unknown as typeof Account.find;
    Account.updateMany = (async (filter: any, op: any) => {
      updateManyFilter = filter;
      updateManyOp = op;
      return { modifiedCount: 5 };
    }) as unknown as typeof Account.updateMany;

    const service = new FacilityService();
    await service.setActive(facilityId.toString(), false);

    assert.equal(saved, true);
    assert.equal(mockFacility.isActive, false);
    assert.equal(mockFacility.manager, null);
    
    // Đảm bảo updateMany được gọi để gỡ nhân viên
    assert.deepEqual(updateManyFilter, { facility: facilityId.toString() });
    assert.deepEqual(updateManyOp, { $set: { facility: null } });
  });
});

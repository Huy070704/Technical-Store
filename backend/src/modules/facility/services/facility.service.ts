import { Service } from "typedi";
import { Types } from "mongoose";
import { Facility } from "../models/facility.model";
import { Account } from "../../auth/models/account.model";
import { EntityNotFoundException } from "@/shared/exceptions/http-exceptions";

/** Thông tin người quản lý cơ sở (rút gọn cho UI). */
export interface FacilityManagerDto {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
}

/** Nhân viên thuộc cơ sở (dùng cho màn hình chi tiết). */
export interface FacilityStaffDto {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  role: string | null;
}

/** Một cơ sở kèm số liệu phục vụ bảng quản lý. */
export interface FacilityListItemDto {
  id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  manager: FacilityManagerDto | null;
  staffCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Cơ sở kèm danh sách nhân viên (màn hình chi tiết). */
export interface FacilityDetailDto extends FacilityListItemDto {
  staffs: FacilityStaffDto[];
}

/** Thẻ KPI tổng quan. */
export interface FacilitySummaryDto {
  total: number;
  active: number;
  inactive: number;
  assignedStaff: number;
}

export interface FacilityListResponseDto {
  facilities: FacilityListItemDto[];
  summary: FacilitySummaryDto;
}

/** Payload cập nhật cơ sở. */
export interface UpdateFacilityDto {
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

type PopulatedManager = {
  _id: Types.ObjectId;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
} | null;

@Service()
export class FacilityService {
  /** Chuẩn hoá 1 document Facility (đã populate manager) thành DTO + số nhân viên. */
  private toListItem(facility: any, staffCount: number): FacilityListItemDto {
    const manager = facility.manager as PopulatedManager;
    return {
      id: facility._id.toString(),
      name: facility.name ?? null,
      address: facility.address ?? null,
      phone: facility.phone ?? null,
      email: facility.email ?? null,
      isActive: facility.isActive,
      manager: manager
        ? {
            id: manager._id.toString(),
            name: manager.name ?? null,
            email: manager.email ?? null,
            avatar: manager.avatar ?? null,
          }
        : null,
      staffCount,
      createdAt: facility.createdAt,
      updatedAt: facility.updatedAt,
    };
  }

  /**
   * Lấy toàn bộ cơ sở kèm quản lý, số nhân viên và KPI tổng quan.
   * Số nhân viên = số tài khoản có account.facility trỏ tới cơ sở (bao gồm cả quản lý).
   */
  async getFacilities(): Promise<FacilityListResponseDto> {
    const facilities = await Facility.find()
      .populate("manager", "name email avatar")
      .sort({ createdAt: -1 });

    // Đếm nhân viên theo từng cơ sở trong 1 truy vấn aggregate.
    const staffCountRows = await Account.aggregate<{
      _id: Types.ObjectId;
      count: number;
    }>([
      { $match: { facility: { $ne: null }, deletedAt: null } },
      { $group: { _id: "$facility", count: { $sum: 1 } } },
    ]);

    const staffCountByFacility = new Map<string, number>();
    for (const row of staffCountRows) {
      staffCountByFacility.set(row._id.toString(), row.count);
    }

    const items = facilities.map((facility) =>
      this.toListItem(facility, staffCountByFacility.get(facility._id.toString()) ?? 0)
    );

    const active = items.filter((f) => f.isActive).length;
    const assignedStaff = items.reduce((sum, f) => sum + f.staffCount, 0);

    return {
      facilities: items,
      summary: {
        total: items.length,
        active,
        inactive: items.length - active,
        assignedStaff,
      },
    };
  }

  /** Lấy chi tiết 1 cơ sở kèm danh sách nhân viên. */
  async getFacilityById(id: string): Promise<FacilityDetailDto> {
    const facility = await Facility.findById(id).populate("manager", "name email avatar");
    if (!facility) throw new EntityNotFoundException("Facility");

    const staffAccounts = await Account.find({ facility: id })
      .populate("role", "name")
      .sort({ createdAt: 1 });

    const staffs: FacilityStaffDto[] = staffAccounts.map((acc: any) => ({
      id: acc._id.toString(),
      name: acc.name ?? null,
      email: acc.email ?? null,
      phone: acc.phone ?? null,
      avatar: acc.avatar ?? null,
      role: acc.role?.name ?? null,
    }));

    return { ...this.toListItem(facility, staffs.length), staffs };
  }

  /** Cập nhật thông tin cơ sở. */
  async updateFacility(id: string, payload: UpdateFacilityDto): Promise<FacilityDetailDto> {
    const facility = await Facility.findById(id);
    if (!facility) throw new EntityNotFoundException("Facility");

    if (payload.name !== undefined) facility.name = payload.name;
    if (payload.address !== undefined) facility.address = payload.address ?? undefined;
    if (payload.phone !== undefined) facility.phone = payload.phone ?? undefined;
    if (payload.email !== undefined) facility.email = payload.email ?? undefined;

    await facility.save();
    return this.getFacilityById(id);
  }

  /** Bật/tắt (khóa) hoạt động của cơ sở. */
  async setActive(id: string, isActive: boolean): Promise<FacilityDetailDto> {
    const facility = await Facility.findById(id);
    if (!facility) throw new EntityNotFoundException("Facility");
    facility.isActive = isActive;

    // Khi khóa cơ sở: gỡ toàn bộ nhân viên về trạng thái 'Chưa phân công'
    // và xóa quản lý của cơ sở.
    if (!isActive) {
      await Account.updateMany({ facility: id }, { $set: { facility: null } });
      facility.manager = null;
    }

    await facility.save();
    return this.getFacilityById(id);
  }
}

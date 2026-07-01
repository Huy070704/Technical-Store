import { Service } from "typedi";
import { Types } from "mongoose";
import { StaffRequest, type StaffRequestRole, type StaffRequestStatus } from "../models/staffRequest.model";
import { Account } from "../../auth/models/account.model";
import { Facility } from "../../facility/models/facility.model";
import {
  BadRequestException,
  EntityNotFoundException,
} from "@/shared/exceptions/http-exceptions";

const STAFF_REQUEST_POPULATE = [
  { path: "facility", select: "name address" },
  { path: "requestedBy", select: "name email" },
  { path: "reviewedBy", select: "name email" },
];

export interface CreateStaffRequestDto {
  roleNeeded: StaffRequestRole;
  quantity: number;
  reason: string;
}

export interface StaffRequestManagementFilters {
  status?: StaffRequestStatus | "all";
  page?: number;
  pageSize?: number;
}

@Service()
export class StaffRequestService {
  private async resolveManagerFacilityId(accountId: string): Promise<string> {
    const account = await Account.findById(accountId).lean();
    if (!account?.facility) {
      throw new BadRequestException("Tài khoản manager chưa được gán cơ sở.");
    }
    return account.facility.toString();
  }

  private mapRequest(doc: any) {
    const json = doc.toJSON ? doc.toJSON() : doc;
    return {
      id: json.id,
      facilityId: json.facility?.id ?? json.facility?._id?.toString?.() ?? json.facility,
      facilityName: json.facility?.name ?? null,
      facilityAddress: json.facility?.address ?? null,
      requestedBy: json.requestedBy
        ? {
            id: json.requestedBy.id ?? json.requestedBy._id?.toString?.(),
            name: json.requestedBy.name,
            email: json.requestedBy.email,
          }
        : null,
      roleNeeded: json.roleNeeded,
      quantity: json.quantity,
      reason: json.reason,
      status: json.status,
      reviewedBy: json.reviewedBy
        ? {
            id: json.reviewedBy.id ?? json.reviewedBy._id?.toString?.(),
            name: json.reviewedBy.name,
            email: json.reviewedBy.email,
          }
        : null,
      reviewedAt: json.reviewedAt,
      adminNote: json.adminNote,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,
    };
  }

  async createRequest(accountId: string, dto: CreateStaffRequestDto) {
    const facilityId = await this.resolveManagerFacilityId(accountId);

    const facility = await Facility.findOne({ _id: facilityId, isActive: true });
    if (!facility) {
      throw new EntityNotFoundException("Facility");
    }

    const pendingCount = await StaffRequest.countDocuments({
      facility: facilityId,
      requestedBy: accountId,
      status: "pending",
    });
    if (pendingCount > 0) {
      throw new BadRequestException("Bạn đã có yêu cầu đang chờ duyệt cho cơ sở này.");
    }

    const request = await StaffRequest.create({
      facility: facilityId,
      requestedBy: accountId,
      roleNeeded: dto.roleNeeded,
      quantity: dto.quantity,
      reason: dto.reason.trim(),
      status: "pending",
    });

    const populated = await StaffRequest.findById(request._id).populate(STAFF_REQUEST_POPULATE);
    return this.mapRequest(populated);
  }

  async getMyRequests(accountId: string, page = 1, pageSize = 10) {
    const facilityId = await this.resolveManagerFacilityId(accountId);
    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.max(1, Number(pageSize) || 10);

    const filter = { requestedBy: accountId, facility: facilityId };
    const [items, total] = await Promise.all([
      StaffRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safePageSize)
        .limit(safePageSize)
        .populate(STAFF_REQUEST_POPULATE),
      StaffRequest.countDocuments(filter),
    ]);

    return {
      items: items.map((item) => this.mapRequest(item)),
      total,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.ceil(total / safePageSize) || 1,
    };
  }

  async getManagementRequests(filters: StaffRequestManagementFilters = {}) {
    const status = filters.status ?? "all";
    const page = Math.max(1, Number(filters.page) || 1);
    const pageSize = Math.max(1, Number(filters.pageSize) || 10);

    const query: Record<string, unknown> = {};
    if (status !== "all") {
      query.status = status;
    }

    const [items, total, pendingCount] = await Promise.all([
      StaffRequest.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .populate(STAFF_REQUEST_POPULATE),
      StaffRequest.countDocuments(query),
      StaffRequest.countDocuments({ status: "pending" }),
    ]);

    return {
      items: items.map((item) => this.mapRequest(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
      pendingCount,
    };
  }

  async reviewRequest(
    requestId: string,
    adminId: string,
    status: "approved" | "rejected",
    adminNote?: string
  ) {
    if (!Types.ObjectId.isValid(requestId)) {
      throw new BadRequestException("Mã yêu cầu không hợp lệ.");
    }

    const request = await StaffRequest.findById(requestId);
    if (!request) {
      throw new EntityNotFoundException("StaffRequest");
    }

    if (request.status !== "pending") {
      throw new BadRequestException("Yêu cầu này đã được xử lý.");
    }

    request.status = status;
    request.reviewedBy = new Types.ObjectId(adminId);
    request.reviewedAt = new Date();
    request.adminNote = adminNote?.trim() || null;
    await request.save();

    const populated = await StaffRequest.findById(request._id).populate(STAFF_REQUEST_POPULATE);
    return this.mapRequest(populated);
  }
}

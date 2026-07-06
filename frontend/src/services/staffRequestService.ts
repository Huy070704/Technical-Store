import { api, unwrapApiData } from './api';

export type StaffRequestRole = 'staff' | 'manager' | 'shipper';
export type StaffRequestStatus = 'pending' | 'approved' | 'rejected';

export interface StaffRequestAccount {
  id: string;
  name?: string;
  email?: string;
}

export interface StaffRequest {
  id: string;
  facilityId: string;
  facilityName?: string | null;
  facilityAddress?: string | null;
  requestedBy?: StaffRequestAccount | null;
  roleNeeded: StaffRequestRole;
  quantity: number;
  reason: string;
  status: StaffRequestStatus;
  reviewedBy?: StaffRequestAccount | null;
  reviewedAt?: string | null;
  adminNote?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface StaffRequestListResponse {
  items: StaffRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  pendingCount?: number;
}

export interface CreateStaffRequestPayload {
  roleNeeded: StaffRequestRole;
  quantity: number;
  reason: string;
}

type StaffRequestPayload = { request?: StaffRequest };
type StaffRequestListPayload = StaffRequestListResponse & { requests?: StaffRequest[] };

class StaffRequestService {
  async createRequest(payload: CreateStaffRequestPayload): Promise<StaffRequest> {
    const response = await api.post('/staff-requests', payload);
    const data = unwrapApiData<StaffRequestPayload & StaffRequest>(response);
    if (data.request) return data.request;
    return data as StaffRequest;
  }

  async getMyRequests(page = 1, pageSize = 10): Promise<StaffRequestListResponse> {
    const response = await api.get('/staff-requests/my', { params: { page, pageSize } });
    return unwrapApiData<StaffRequestListPayload>(response);
  }

  async getManagementRequests(
    status: StaffRequestStatus | 'all' = 'all',
    page = 1,
    pageSize = 20,
  ): Promise<StaffRequestListResponse> {
    const response = await api.get('/staff-requests/management', {
      params: { status, page, pageSize },
    });
    return unwrapApiData<StaffRequestListPayload>(response);
  }

  async approveRequest(id: string, adminNote?: string): Promise<StaffRequest> {
    const response = await api.patch(`/staff-requests/${id}/approve`, { adminNote });
    const data = unwrapApiData<StaffRequestPayload>(response);
    if (!data.request) throw new Error('Approve failed');
    return data.request;
  }

  async rejectRequest(id: string, adminNote?: string): Promise<StaffRequest> {
    const response = await api.patch(`/staff-requests/${id}/reject`, { adminNote });
    const data = unwrapApiData<StaffRequestPayload>(response);
    if (!data.request) throw new Error('Reject failed');
    return data.request;
  }
}

export const staffRequestService = new StaffRequestService();

export const STAFF_REQUEST_ROLE_LABELS: Record<StaffRequestRole, string> = {
  staff: 'Nhân viên (Staff)',
  manager: 'Quản lý (Manager)',
  shipper: 'Giao hàng (Shipper)',
};

export const STAFF_REQUEST_STATUS_LABELS: Record<StaffRequestStatus, string> = {
  pending: 'Chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
};

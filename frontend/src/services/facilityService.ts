import { api, unwrapApiData } from './api';

export interface FacilityManager {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
}

export interface FacilityStaff {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  role: string | null;
}

export interface Facility {
  id: string;
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  manager: FacilityManager | null;
  staffCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityDetail extends Facility {
  staffs: FacilityStaff[];
}

export interface FacilitySummary {
  total: number;
  active: number;
  inactive: number;
  assignedStaff: number;
}

export interface FacilityListResponse {
  facilities: Facility[];
  summary: FacilitySummary;
}

export interface UpdateFacilityPayload {
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
}

class FacilityService {
  async getFacilities(): Promise<FacilityListResponse> {
    const response = await api.get('/facilities');
    return unwrapApiData<FacilityListResponse>(response);
  }

  async getFacilityById(id: string): Promise<FacilityDetail> {
    const response = await api.get(`/facilities/${id}`);
    return unwrapApiData<FacilityDetail>(response);
  }

  async updateFacility(id: string, payload: UpdateFacilityPayload): Promise<FacilityDetail> {
    const response = await api.patch(`/facilities/${id}`, payload);
    return unwrapApiData<FacilityDetail>(response);
  }

  async setActive(id: string, isActive: boolean): Promise<FacilityDetail> {
    const response = await api.patch(`/facilities/${id}/active`, { isActive });
    return unwrapApiData<FacilityDetail>(response);
  }
}

export const facilityService = new FacilityService();

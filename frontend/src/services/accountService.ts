// gom api lien quan den quan ly tai khoan, chi danh cho admin
// chi goi api toi backend, ko xu ly logic gi o day, de de bao tri va tach biet ro rang giua api va logic
import { api, unwrapApiData } from './api';
import type { AuthUser } from '@/types/auth';

export const adminAccountService = {
  /**
   * Lấy danh sách tất cả tài khoản
   */
  async getAllAccounts(): Promise<AuthUser[]> {
    const response = await api.get('/account/all');
    return unwrapApiData<AuthUser[]>(response);
  },

  /**
   * Cập nhật thông tin tài khoản (gồm cả block/unblock)
   */
  async updateAccount(email: string, payload: { name?: string; phone?: string; roleSlug?: string; isBlocked?: boolean }): Promise<AuthUser> {
    const response = await api.patch('/account/update', { email, ...payload });
    return unwrapApiData<AuthUser>(response);
  },

  /**
   * Lấy danh sách các roles hệ thống (không bao gồm admin)
   */
  async getRoles(): Promise<{ id: string; name: string; slug: string }[]> {
    const response = await api.get('/auth/roles');
    return unwrapApiData<{ id: string; name: string; slug: string }[]>(response);
  },
};

// xu ly logic xac thuc, luu token va thong tin nguoi dung trong localStorage, cung cap context de toan bo ung dung su dung
// cho aucontext goi den
// import type { AxiosError } from 'axios';
import type {
  AuthUser,
  LoginCredentials,
  RegisterPayload,
  ApiMessageResponse,
  TokenResponse,
} from '../types/auth';
import { env } from '@/config/env';
import { api, unwrapApiData } from './api';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const normalizeOtp = (otp: string) => {
  const digits = otp.replace(/\D/g, '');
  return digits.length >= 6 ? digits.slice(-6) : digits.padStart(6, '0');
};

// const getErrorMessage = (error: unknown, fallback: string): string => {
//   const axiosError = error as AxiosError<{ message?: string }>;
//   return axiosError.response?.data?.message ?? fallback;
// };

const mapAccountToUser = (account: Record<string, unknown>): AuthUser => {
  const role = account.role as AuthUser['role'];
  return {
    accountId: account.id as string | undefined,
    email: (account.email as string) ?? '',
    name: account.name as string | undefined,
    phone: account.phone as string | undefined,
    address: account.address as string | null | undefined,
    addresses: account.addresses as string[] | undefined,
    role,
    isRegistered: account.isRegistered as boolean | undefined,
    isBlocked: account.isBlocked as boolean | undefined,
  };
};

export const authService = {
  async register(payload: RegisterPayload): Promise<ApiMessageResponse> {
    const email = normalizeEmail(payload.email);
    const response = await api.post('/account/register', {
      email,
      password: payload.password,
      name: payload.name.trim(),
      phone: payload.phone ?? undefined,
    });
    return unwrapApiData<ApiMessageResponse>(response);
  },

  async verifyRegister(email: string, otp: string): Promise<string> {
    const response = await api.post('/account/verify-register', {
      email: normalizeEmail(email),
      otp: normalizeOtp(otp),
    });
    const data = unwrapApiData<TokenResponse>(response);
    return data.accessToken;
  },

  async resendOtp(email: string): Promise<ApiMessageResponse> {
    const response = await api.post('/account/resend-otp', {
      email: normalizeEmail(email),
    });
    return unwrapApiData<ApiMessageResponse>(response);
  },



  async login(credentials: LoginCredentials): Promise<string> {
    const response = await api.post('/account/login', {
      email: normalizeEmail(credentials.email),
      password: credentials.password,
    });
    const data = unwrapApiData<TokenResponse>(response);
    return data.accessToken;
  },

  async forgotPassword(email: string): Promise<ApiMessageResponse> {
    const response = await api.post('/account/forgot-password', {
      email: normalizeEmail(email),
    });
    return unwrapApiData<ApiMessageResponse>(response);
  },

  async sendOtp(email: string): Promise<void> {
    await api.post('/otp/send', { email: normalizeEmail(email) });
  },

  async verifyOtp(email: string, otp: string): Promise<boolean> {
    const response = await api.post('/otp/verify', {
      email: normalizeEmail(email),
      otp: normalizeOtp(otp),
    });
    const data = unwrapApiData<{ verified?: boolean }>(response);
    return data.verified === true;
  },

  async resetPassword(
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<ApiMessageResponse> {
    const response = await api.post('/account/verify-change-password', {
      email: normalizeEmail(email),
      otp: normalizeOtp(otp),
      newPassword,
    });
    return unwrapApiData<ApiMessageResponse>(response);
  },

  async getUserProfile(): Promise<AuthUser> {
    const response = await api.get('/account/details');
    const account = unwrapApiData<Record<string, unknown>>(response);
    return mapAccountToUser(account);
  },

  async updateProfile(
    email: string,
    payload: { name?: string; phone?: string; address?: string | null; addresses?: string[] }
  ): Promise<AuthUser> {
    const response = await api.patch('/account/update', {
      email,
      ...payload,
    });
    const account = unwrapApiData<Record<string, unknown>>(response);
    const user = mapAccountToUser(account);
    const savedUser = this.getUser();
    if (savedUser) {
      this.persistSession({ ...savedUser, ...user }, this.getToken() || '');
    }
    return user;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/account/logout');
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('user');
    }
  },

  isAuthenticated(): boolean {
    return !!(localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));
  },

  getToken(): string | null {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  },

  getUser(): AuthUser | null {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  persistSession(user: AuthUser, token: string, rememberMe = true): void {
    if (rememberMe) {
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      if (user.email) {
        localStorage.setItem('rememberedEmail', user.email);
      }
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('user');
    } else {
      sessionStorage.setItem('authToken', token);
      sessionStorage.setItem('user', JSON.stringify(user));
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      localStorage.removeItem('rememberedEmail');
    }
  },
};

export const getRoleName = (user: AuthUser | null): string | null => {
  if (!user?.role) return null;
  return typeof user.role === 'object' ? user.role.name : user.role;
};

export const getAdminHomePath = (roleName: string | null): string | null => {
  const role = String(roleName ?? '').toLowerCase();
  const paths: Record<string, string> = {
    admin: '/admin/dashboard',
    manager: '/admin/dashboard',
    staff: '/staff/dashboard',
    shipper: '/admin/shippers',
  };
  return paths[role] ?? null;
};

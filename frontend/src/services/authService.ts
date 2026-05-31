import type { AxiosError } from 'axios';
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

const getErrorMessage = (error: unknown, fallback: string): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError.response?.data?.message ?? fallback;
};

const mapAccountToUser = (account: Record<string, unknown>): AuthUser => {
  const role = account.role as AuthUser['role'];
  return {
    accountId: account.id as string | undefined,
    email: (account.email as string) ?? '',
    name: account.name as string | undefined,
    phone: account.phone as string | undefined,
    role,
    isRegistered: account.isRegistered as boolean | undefined,
  };
};

export const authService = {
  async register(payload: RegisterPayload): Promise<ApiMessageResponse> {
    const email = normalizeEmail(payload.email);
    const response = await api.post('/account/register', {
      email,
      password: payload.password,
      name: payload.name.trim(),
      phone: payload.phone ?? email,
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

  /** Redirect tới Google OAuth (GET /account/auth/google) */
  getGoogleAuthUrl(): string {
    return `${env.apiUrl}/account/auth/google`;
  },

  startGoogleAuth(): void {
    window.location.href = this.getGoogleAuthUrl();
  },

  /** Đổi code từ /auth/callback → accessToken (POST /account/auth/google/exchange) */
  async exchangeGoogleCode(code: string): Promise<string> {
    const response = await api.post('/account/auth/google/exchange', { code });
    const data = unwrapApiData<TokenResponse>(response);
    return data.accessToken;
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

  async logout(): Promise<void> {
    try {
      await api.post('/account/logout');
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  },

  getToken(): string | null {
    return localStorage.getItem('authToken');
  },

  getUser(): AuthUser | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  },

  persistSession(user: AuthUser, token: string): void {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
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
    staff: '/admin/products',
    shipper: '/admin/shippers',
  };
  return paths[role] ?? null;
};

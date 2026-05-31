import axios, { type AxiosResponse } from 'axios';
import { env } from '../config/env';

export const api = axios.create({
  baseURL: env.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const AUTH_PUBLIC_ROUTES = [
  '/account/login',
  '/account/register',
  '/account/verify-register',
  '/account/resend-otp',
  '/account/forgot-password',
  '/account/verify-change-password',
  '/otp/send',
  '/otp/verify',
  '/jwt/refresh-token',
  '/account/auth/google',
  '/account/auth/google/exchange',
];

/** Backend bọc response: { success, data } */
export const unwrapApiData = <T,>(response: AxiosResponse): T => {
  const body = response.data as { success?: boolean; data?: T } | T;
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
};

api.interceptors.request.use((config) => {
  const url = config.url ?? '';
  const isPublic = AUTH_PUBLIC_ROUTES.some((route) => url.includes(route));

  if (!isPublic) {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/account/login');

    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.dispatchEvent(
        new CustomEvent('auth:unauthorized', {
          detail: { message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
        }),
      );
      window.dispatchEvent(
        new CustomEvent('auth:logout', { detail: { redirectTo: '/login' } }),
      );
    }

    return Promise.reject(error);
  },
);

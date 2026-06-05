// cau hinh axios instance de su dung trong toan bo ung dung
import axios, { type AxiosResponse } from 'axios';
import { env } from '../config/env';

export const api = axios.create({ // tao instance axios de cau hinh chung cho toan bo ung dung
  baseURL: env.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const AUTH_PUBLIC_ROUTES = [ // api ko can token
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
  '/products',
  '/feedbacks',
];

/** Backend bọc response: { success, data } */
export const unwrapApiData = <T,>(response: AxiosResponse): T => { // chi lay data tu response, chi du lieu can thiet trong ung dung
  const body = response.data as { success?: boolean; data?: T } | T;
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as { data: T }).data;
  }
  return body as T;
};

api.interceptors.request.use((config) => { // tu dong gan jwt vao request
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = token.startsWith('Bearer ')
      ? token
      : `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use( // xu ly token het han
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

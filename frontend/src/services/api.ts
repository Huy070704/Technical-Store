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
  '/orders/guest',
  '/payment/status/',
  '/payment/payos-webhook',
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
  const url = config.url ?? '';
  const isPublic = AUTH_PUBLIC_ROUTES.some((route) => url.startsWith(route));
  if (!isPublic) {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = token.startsWith('Bearer ')
        ? token
        : `Bearer ${token}`;
    }
  }
  return config;
});

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

const forceLogout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('user');
  window.dispatchEvent(
    new CustomEvent('auth:unauthorized', {
      detail: { message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' },
    }),
  );
  window.dispatchEvent(
    new CustomEvent('auth:logout', { detail: { redirectTo: '/login' } }),
  );
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isPublic = AUTH_PUBLIC_ROUTES.some((r) => (originalRequest?.url ?? '').startsWith(r));

    if (error.response?.status === 401 && !isPublic && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue other 401s until refresh completes
        return new Promise((resolve, reject) => {
          refreshSubscribers.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
          // Reject after a timeout to avoid indefinite hang
          setTimeout(() => reject(error), 10_000);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await api.post('/jwt/refresh-token');
        const newToken: string =
          typeof refreshResponse.data === 'string'
            ? refreshResponse.data
            : unwrapApiData<{ accessToken?: string }>(refreshResponse)?.accessToken ?? '';

        if (!newToken) throw new Error('No token in refresh response');

        // Persist new token in the same storage as the old one
        if (localStorage.getItem('authToken')) {
          localStorage.setItem('authToken', newToken);
        } else {
          sessionStorage.setItem('authToken', newToken);
        }

        onTokenRefreshed(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        refreshSubscribers = [];
        forceLogout();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

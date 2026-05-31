export interface AuthUser {
  accountId?: string;
  email: string;
  name?: string;
  phone?: string;
  role: string | { name: string; slug?: string };
  isRegistered?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface ApiMessageResponse {
  message?: string;
}

export interface TokenResponse {
  accessToken: string;
}

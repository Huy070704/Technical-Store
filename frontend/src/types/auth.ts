export interface AuthUser {
  accountId?: string;
  email: string;
  name?: string;
  phone?: string;
  role: string | { name: string; slug?: string };
  isRegistered?: boolean;
  isBlocked?: boolean;
  // Cơ sở (facility) mà nhân viên được phân công. Có thể là id thô hoặc đã populate { id, name }.
  // Lưu ý: backend serialize _id -> id, nên object đã populate dùng key `id`.
  facility?: string | { id: string; name?: string } | null;
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

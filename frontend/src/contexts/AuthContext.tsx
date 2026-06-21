// quan ly trang thai xac thuc nguoi dung, cung cap cac ham login/logout va tu dong refresh profile khi co token
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '../types/auth';
import { authService } from '../services/authService';
import { wishlistService } from '../services/wishlistService';

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  clearAuthState: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(authService.getUser());
  const [token, setToken] = useState<string | null>(authService.getToken());

  const clearAuthState = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('user');
    wishlistService.resetLocal();
    setUser(null);
    setToken(null);
  }, []);

  const login = useCallback((userData: AuthUser, accessToken: string, rememberMe?: boolean) => {
    authService.persistSession(userData, accessToken, rememberMe);
    setUser(userData);
    setToken(accessToken);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    wishlistService.resetLocal();
    setUser(null);
    setToken(null);
  }, []);

  const isAuthenticated = useCallback(() => !!token, [token]);

  useEffect(() => {
    const handleUnauthorized = () => clearAuthState();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [clearAuthState]);

  useEffect(() => {
    const handleLogoutNav = (event: Event) => {
      const detail = (event as CustomEvent<{ redirectTo?: string }>).detail;
      if (detail?.redirectTo && window.location.pathname !== detail.redirectTo) {
        window.location.href = detail.redirectTo;
      }
    };
    window.addEventListener('auth:logout', handleLogoutNav);
    return () => window.removeEventListener('auth:logout', handleLogoutNav);
  }, []);

  useEffect(() => {
    if (!token) return;

    const refreshProfile = async () => {
      try {
        const profile = await authService.getUserProfile();
        setUser(profile);
        if (localStorage.getItem('authToken')) {
          localStorage.setItem('user', JSON.stringify(profile));
        } else {
          sessionStorage.setItem('user', JSON.stringify(profile));
        }
      } catch {
        /* dùng cache local nếu API lỗi */
      }
    };

    void refreshProfile();
    // Đồng bộ wishlist từ server vào localStorage khi đã có phiên đăng nhập
    void wishlistService.syncFromServer();
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      login,
      logout,
      isAuthenticated,
      clearAuthState,
    }),
    [user, token, login, logout, isAuthenticated, clearAuthState],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider');
  }
  return context;
};

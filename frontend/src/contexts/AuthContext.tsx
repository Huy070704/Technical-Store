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

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: () => boolean;
  clearAuthState: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(authService.getUser());
  const [token, setToken] = useState<string | null>(authService.getToken());

  const clearAuthState = useCallback(() => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
  }, []);

  const login = useCallback((userData: AuthUser, accessToken: string) => {
    authService.persistSession(userData, accessToken);
    setUser(userData);
    setToken(accessToken);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
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
        localStorage.setItem('user', JSON.stringify(profile));
      } catch {
        /* dùng cache local nếu API lỗi */
      }
    };

    void refreshProfile();
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

import type { NavigateFunction } from 'react-router-dom';
import type { AuthUser } from '@/types/auth';
import {
  authService,
  getAdminHomePath,
  getRoleName,
} from '@/services/authService';
import { formatDateTime } from '@/utils/dateFormatter';

/** Hoàn tất đăng nhập sau khi có accessToken (email hoặc Google). */
export const completeAuthSession = async (
  accessToken: string,
  login: (user: AuthUser, token: string) => void,
  navigate: NavigateFunction,
  welcomeFallback = 'Chào mừng bạn trở lại!',
) => {
  login({ email: '', role: 'customer' }, accessToken);
  await new Promise((r) => setTimeout(r, 100));

  try {
    const profile = await authService.getUserProfile();
    login(profile, accessToken);

    const adminPath = getAdminHomePath(getRoleName(profile));
    const roleLabel = getRoleName(profile);

    if (adminPath) {
      navigate(adminPath, {
        state: {
          welcomeMessage: `Chào mừng ${roleLabel} trở lại!`,
          loginTime: formatDateTime(new Date()),
        },
      });
    } else {
      navigate('/', {
        state: {
          welcomeMessage: welcomeFallback,
          loginTime: formatDateTime(new Date()),
        },
      });
    }
  } catch {
    navigate('/', { state: { welcomeMessage: welcomeFallback } });
  }
};

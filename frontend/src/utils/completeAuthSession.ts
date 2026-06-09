import type { NavigateFunction } from 'react-router-dom';
import type { AuthUser } from '@/types/auth';
import {
  authService,
  getAdminHomePath,
  getRoleName,
} from '@/services/authService';
import { formatDateTime } from '@/utils/dateFormatter';
import { guestCartService } from '@/services/guestCartService';
import { cartService } from '@/services/cartService';

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
    const guestCart = guestCartService.getCart();
    if (guestCart.items.length > 0) {
      try {
        await cartService.mergeGuestLines(
          guestCart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        );
        guestCartService.clearCart();
      } catch (mergeErr) {
        console.error('Guest cart merge failed:', mergeErr);
      }
    }

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

import { api, unwrapApiData } from './api';
import type { ServerCart } from '@/types/cart';

/**
 * API giỏ hàng (yêu cầu Bearer token).
 * Response sau interceptor: { success, statusCode, data: ServerCart }
 */
export const cartService = {
  /** GET /api/cart/view */
  async viewCart(): Promise<ServerCart> {
    const response = await api.get('/cart/view');
    return unwrapApiData<ServerCart>(response);
  },

  /** POST /api/cart/add */
  async addToCart(productId: string, quantity: number): Promise<ServerCart> {
    const response = await api.post('/cart/add', { productId, quantity });
    return unwrapApiData<ServerCart>(response);
  },

  /** POST /api/cart/increase */
  async increaseQuantity(productId: string, amount = 1): Promise<ServerCart> {
    const response = await api.post('/cart/increase', { productId, amount });
    return unwrapApiData<ServerCart>(response);
  },

  /** POST /api/cart/decrease */
  async decreaseQuantity(productId: string, amount = 1): Promise<ServerCart> {
    const response = await api.post('/cart/decrease', { productId, amount });
    return unwrapApiData<ServerCart>(response);
  },

  /** PATCH /api/cart/remove */
  async removeItem(productId: string): Promise<ServerCart> {
    const response = await api.patch('/cart/remove', { productId });
    return unwrapApiData<ServerCart>(response);
  },

  /** POST /api/cart/clear */
  async clearCart(): Promise<ServerCart> {
    const response = await api.post('/cart/clear');
    return unwrapApiData<ServerCart>(response);
  },

  /** POST /api/cart/merge-guest — sau đăng nhập */
  async mergeGuestLines(
    lines: { productId: string; quantity: number }[],
  ): Promise<ServerCart> {
    const response = await api.post('/cart/merge-guest', { lines });
    return unwrapApiData<ServerCart>(response);
  },
};

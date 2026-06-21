import { api, unwrapApiData } from './api';

const WISHLIST_KEY = 'technical_store_wishlist';
/** Sự kiện báo wishlist thay đổi để useWishlist re-render. */
export const WISHLIST_EVENT = 'wishlist-updated';

const isAuthed = (): boolean =>
  !!(localStorage.getItem('authToken') || sessionStorage.getItem('authToken'));

const readIds = (): string[] => {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
};

/** Ghi localStorage + phát sự kiện để các hook cập nhật. */
const writeIds = (ids: string[]): void => {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  globalThis.dispatchEvent(new Event(WISHLIST_EVENT));
};

/**
 * Wishlist hybrid:
 *  - Khách chưa đăng nhập: chỉ dùng localStorage.
 *  - Đã đăng nhập: localStorage là cache đồng bộ; mọi thay đổi được đẩy lên
 *    server (/wishlist/*) rồi đối chiếu lại bằng danh sách server trả về.
 */
export const wishlistService = {
  getIds(): string[] {
    return readIds();
  },

  saveIds(ids: string[]): void {
    writeIds(ids);
  },

  isInWishlist(productId: string): boolean {
    return readIds().includes(productId);
  },

  /** Toggle lạc quan: cập nhật localStorage ngay (sync), nếu đã đăng nhập thì đồng bộ server. */
  toggle(productId: string): boolean {
    const prev = readIds();
    const exists = prev.includes(productId);
    const next = exists ? prev.filter((id) => id !== productId) : [...prev, productId];
    writeIds(next);

    if (isAuthed()) {
      api
        .post('/wishlist/toggle', { productId })
        .then((res) => {
          const data = unwrapApiData<{ productIds?: string[] }>(res);
          if (Array.isArray(data?.productIds)) writeIds(data.productIds);
        })
        .catch(() => {
          // Server lỗi → hoàn tác về trạng thái trước đó
          writeIds(prev);
        });
    }
    return !exists;
  },

  /** Xóa toàn bộ wishlist (local + server nếu đã đăng nhập). */
  clear(): void {
    writeIds([]);
    if (isAuthed()) {
      api.post('/wishlist/clear').catch(() => undefined);
    }
  },

  /** Xóa cache local (không gọi server) — dùng khi đăng xuất để tránh lẫn user. */
  resetLocal(): void {
    writeIds([]);
  },

  /** Tải wishlist từ server vào localStorage (gọi khi vào app lúc đã đăng nhập). */
  async syncFromServer(): Promise<void> {
    if (!isAuthed()) return;
    try {
      const res = await api.get('/wishlist/view');
      const data = unwrapApiData<{ productIds?: string[] }>(res);
      writeIds(Array.isArray(data?.productIds) ? data.productIds : []);
    } catch {
      // Im lặng — giữ nguyên localStorage hiện tại
    }
  },

  /** Gộp wishlist khách (localStorage) lên tài khoản khi đăng nhập, rồi dùng kết quả server. */
  async mergeOnLogin(): Promise<void> {
    try {
      const localIds = readIds();
      const res = await api.post('/wishlist/merge-guest', { productIds: localIds });
      const data = unwrapApiData<{ productIds?: string[] }>(res);
      writeIds(Array.isArray(data?.productIds) ? data.productIds : localIds);
    } catch {
      // Im lặng — giữ nguyên localStorage hiện tại
    }
  },
};

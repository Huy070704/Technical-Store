import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { wishlistService, WISHLIST_EVENT } from '@/services/wishlistService';

const subscribe = (onStoreChange: () => void) => {
  globalThis.addEventListener(WISHLIST_EVENT, onStoreChange);
  globalThis.addEventListener('storage', onStoreChange);
  return () => {
    globalThis.removeEventListener(WISHLIST_EVENT, onStoreChange);
    globalThis.removeEventListener('storage', onStoreChange);
  };
};

const getSnapshot = () => wishlistService.getIds().join(',');

export const useWishlist = (productId?: string) => {
  const wishlistKey = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const wishlistIds = useMemo(() => wishlistService.getIds(), [wishlistKey]);

  const isWishlisted = productId ? wishlistIds.includes(productId) : false;

  const toggleWishlist = useCallback((id: string) => {
    // wishlistService tự phát WISHLIST_EVENT sau khi ghi localStorage
    return wishlistService.toggle(id);
  }, []);

  const clearWishlist = useCallback(() => {
    wishlistService.clear();
  }, []);

  return {
    isWishlisted,
    toggleWishlist,
    clearWishlist,
    wishlistCount: wishlistIds.length,
    wishlistIds,
  };
};

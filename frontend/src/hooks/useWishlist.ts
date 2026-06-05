import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { wishlistService } from '@/services/wishlistService';

const WISHLIST_EVENT = 'wishlist-updated';

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
    const added = wishlistService.toggle(id);
    globalThis.dispatchEvent(new Event(WISHLIST_EVENT));
    return added;
  }, []);

  const clearWishlist = useCallback(() => {
    wishlistService.clear();
    globalThis.dispatchEvent(new Event(WISHLIST_EVENT));
  }, []);

  return {
    isWishlisted,
    toggleWishlist,
    clearWishlist,
    wishlistCount: wishlistIds.length,
    wishlistIds,
  };
};

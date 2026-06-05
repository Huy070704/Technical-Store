const WISHLIST_KEY = 'technical_store_wishlist';

export const wishlistService = {
  getIds(): string[] {
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
  },

  saveIds(ids: string[]): void {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  },

  isInWishlist(productId: string): boolean {
    return this.getIds().includes(productId);
  },

  toggle(productId: string): boolean {
    const ids = this.getIds();
    const exists = ids.includes(productId);
    const next = exists ? ids.filter((id) => id !== productId) : [...ids, productId];
    this.saveIds(next);
    return !exists;
  },

  clear(): void {
    this.saveIds([]);
  },
};

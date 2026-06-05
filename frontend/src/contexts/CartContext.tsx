import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { guestCartService, type GuestCartItem } from '@/services/guestCartService';
import { productService } from '@/services/productService';
import type { CartLineItem } from '@/types/cart';

export interface CartItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    stock: number;
    images: { id: string; url: string }[];
    category?: string;
  };
}

interface CartContextValue {
  items: CartItem[];
  totalAmount: number;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
  operationLoading: boolean;
  selectedProductIds: Set<string>;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getItemQuantity: (productId: string) => number;
  refreshCart: () => void;
  increaseQuantity: (productId: string, delta?: number) => Promise<void>;
  decreaseQuantity: (productId: string, delta?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  toggleItemSelection: (productId: string, selected: boolean) => void;
  selectAllItems: (selected: boolean) => void;
  getSelectedSubtotal: () => number;
  getSelectedLines: () => CartLineItem[];
}

const CartContext = createContext<CartContextValue | null>(null);

const guestItemsToCartItems = (guestItems: GuestCartItem[]): CartItem[] =>
  guestItems.map((guestItem) => ({
    id: `guest-${guestItem.productId}`,
    quantity: guestItem.quantity,
    product: {
      id: guestItem.productId,
      name: guestItem.name,
      price: guestItem.price,
      stock: guestItem.stock,
      images: guestItem.image ? [{ id: '1', url: guestItem.image }] : [],
      category: guestItem.category,
    },
  }));

const toCartLineItem = (item: CartItem): CartLineItem => ({
  id: item.id,
  quantity: item.quantity,
  product: {
    id: item.product.id,
    name: item.product.name,
    price: item.product.price,
    stock: item.product.stock,
    isActive: true,
    images: item.product.images,
    category: item.product.category,
  },
});

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    () => new Set(),
  );

  const syncFromGuest = useCallback(() => {
    const guestCart = guestCartService.getCart();
    const nextItems = guestItemsToCartItems(guestCart.items);
    setItems(nextItems);
    setTotalAmount(guestCart.totalAmount);
    setSelectedProductIds(new Set(nextItems.map((i) => i.product.id)));
    setIsInitialized(true);
    setError(null);
  }, []);

  useEffect(() => {
    syncFromGuest();
  }, [syncFromGuest]);

  const addToCart = useCallback(
    async (productId: string, quantity: number) => {
      setLoading(true);
      setError(null);
      try {
        const product = await productService.getProductById(productId);
        if (!product) {
          throw new Error('Không tìm thấy sản phẩm');
        }
        guestCartService.addToCart(
          {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.images?.[0]?.url,
            category: product.category?.name,
            stock: product.stock ?? 99,
          },
          quantity,
        );
        syncFromGuest();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Không thể thêm vào giỏ';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [syncFromGuest],
  );

  const clearCart = useCallback(async () => {
    setOperationLoading(true);
    try {
      guestCartService.clearCart();
      syncFromGuest();
    } finally {
      setOperationLoading(false);
    }
  }, [syncFromGuest]);

  const getItemQuantity = useCallback(
    (productId: string) => guestCartService.getItemQuantity(productId),
    [],
  );

  const increaseQuantity = useCallback(
    async (productId: string, delta = 1) => {
      setOperationLoading(true);
      setError(null);
      try {
        const current = guestCartService.getItemQuantity(productId);
        guestCartService.updateQuantity(productId, current + delta);
        syncFromGuest();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Cập nhật thất bại');
        throw err;
      } finally {
        setOperationLoading(false);
      }
    },
    [syncFromGuest],
  );

  const decreaseQuantity = useCallback(
    async (productId: string, delta = 1) => {
      setOperationLoading(true);
      setError(null);
      try {
        const current = guestCartService.getItemQuantity(productId);
        guestCartService.updateQuantity(productId, Math.max(0, current - delta));
        syncFromGuest();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Cập nhật thất bại');
        throw err;
      } finally {
        setOperationLoading(false);
      }
    },
    [syncFromGuest],
  );

  const removeItem = useCallback(
    async (productId: string) => {
      setOperationLoading(true);
      setError(null);
      try {
        guestCartService.removeItem(productId);
        syncFromGuest();
      } finally {
        setOperationLoading(false);
      }
    },
    [syncFromGuest],
  );

  const toggleItemSelection = useCallback(
    (productId: string, selected: boolean) => {
      setSelectedProductIds((prev) => {
        const next = new Set(prev);
        if (selected) {
          next.add(productId);
        } else {
          next.delete(productId);
        }
        return next;
      });
    },
    [],
  );

  const selectAllItems = useCallback(
    (selected: boolean) => {
      if (selected) {
        setSelectedProductIds(new Set(items.map((i) => i.product.id)));
      } else {
        setSelectedProductIds(new Set());
      }
    },
    [items],
  );

  const getSelectedSubtotal = useCallback(() => {
    return items
      .filter((i) => selectedProductIds.has(i.product.id))
      .reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  }, [items, selectedProductIds]);

  const getSelectedLines = useCallback((): CartLineItem[] => {
    return items
      .filter((i) => selectedProductIds.has(i.product.id))
      .map(toCartLineItem);
  }, [items, selectedProductIds]);

  const value = useMemo(
    () => ({
      items,
      totalAmount,
      loading,
      error,
      isInitialized,
      operationLoading,
      selectedProductIds,
      addToCart,
      clearCart,
      getItemQuantity,
      refreshCart: syncFromGuest,
      increaseQuantity,
      decreaseQuantity,
      removeItem,
      toggleItemSelection,
      selectAllItems,
      getSelectedSubtotal,
      getSelectedLines,
    }),
    [
      items,
      totalAmount,
      loading,
      error,
      isInitialized,
      operationLoading,
      selectedProductIds,
      addToCart,
      clearCart,
      getItemQuantity,
      syncFromGuest,
      increaseQuantity,
      decreaseQuantity,
      removeItem,
      toggleItemSelection,
      selectAllItems,
      getSelectedSubtotal,
      getSelectedLines,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider');
  }
  return ctx;
};

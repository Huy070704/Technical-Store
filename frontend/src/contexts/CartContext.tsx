import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { guestCartService, type GuestCartItem } from '@/services/guestCartService';
import { cartService } from '@/services/cartService';
import { productService } from '@/services/productService';
import { useAuth } from '@/contexts/AuthContext';
import type { CartLineItem, ServerCart } from '@/types/cart';
import {
  mapServerCartToLines,
  reconcileSelectedProductIds,
} from '@/utils/cartFormat';

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

export interface CartContextValue {
  items: CartItem[];
  totalAmount: number;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
  operationLoading: boolean;
  selectedProductIds: Set<string>;
  isGuestCart: boolean;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getItemQuantity: (productId: string) => number;
  refreshCart: () => Promise<void>;
  increaseQuantity: (productId: string, delta?: number) => Promise<void>;
  decreaseQuantity: (productId: string, delta?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  toggleItemSelection: (productId: string, selected: boolean) => void;
  selectAllItems: (selected: boolean) => void;
  selectSingleItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  getSelectedSubtotal: () => number;
  getSelectedLines: () => CartLineItem[];
}

export const CartContext = createContext<CartContextValue | null>(null);

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

const serverLinesToCartItems = (lines: CartLineItem[]): CartItem[] =>
  lines.map((line) => ({
    id: line.id,
    quantity: line.quantity,
    product: {
      id: line.product.id,
      name: line.product.name,
      price: line.product.price,
      stock: line.product.stock,
      images: line.product.images ?? [],
      category:
        typeof line.product.category === 'string'
          ? line.product.category
          : line.product.category?.name,
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
  const { isAuthenticated, token } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(
    () => new Set(),
  );

  // Use refs so applyCartState stays stable across renders
  const selectionInitializedRef = useRef(false);
  const prevLineCountRef = useRef(0);
  const selectedProductIdsRef = useRef<Set<string>>(new Set());

  // Keep ref in sync with state
  selectedProductIdsRef.current = selectedProductIds;

  const applyCartState = useCallback(
    (nextItems: CartItem[], nextTotal: number) => {
      setItems(nextItems);
      setTotalAmount(nextTotal);
      const { selected, initialized } = reconcileSelectedProductIds(
        nextItems.map(toCartLineItem),
        selectedProductIdsRef.current,
        prevLineCountRef.current,
        selectionInitializedRef.current,
      );
      selectionInitializedRef.current = initialized;
      prevLineCountRef.current = nextItems.length;
      setSelectedProductIds(selected);
      setIsInitialized(true);
      setError(null);
    },
    [],
  );

  const syncFromGuest = useCallback(() => {
    const guestCart = guestCartService.getCart();
    applyCartState(
      guestItemsToCartItems(guestCart.items),
      guestCart.totalAmount,
    );
  }, [applyCartState]);

  const syncFromServer = useCallback(
    async () => {
      setLoading(true);
      setError(null);
      try {
        const serverCart: ServerCart = await cartService.viewCart();
        const lines = mapServerCartToLines(serverCart);
        applyCartState(
          serverLinesToCartItems(lines),
          Number(serverCart.totalAmount ?? 0),
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Không tải được giỏ hàng';
        setError(message);
        setIsInitialized(true);
      } finally {
        setLoading(false);
      }
    },
    [applyCartState],
  );

  const refreshCart = useCallback(async () => {
    if (isAuthenticated()) {
      await syncFromServer();
    } else {
      syncFromGuest();
    }
  }, [isAuthenticated, syncFromServer, syncFromGuest]);

  useEffect(() => {
    void refreshCart();
    // Re-run only when auth state changes (token), not when refreshCart reference changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const addToCart = useCallback(
    async (productId: string, quantity: number) => {
      setOperationLoading(true);
      setError(null);
      try {
        if (isAuthenticated()) {
          const serverCart = await cartService.addToCart(productId, quantity);
          const lines = mapServerCartToLines(serverCart);
          applyCartState(
            serverLinesToCartItems(lines),
            Number(serverCart.totalAmount ?? 0),
          );
        } else {
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
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Không thể thêm vào giỏ';
        setError(message);
        throw err;
      } finally {
        setOperationLoading(false);
      }
    },
    [isAuthenticated, applyCartState, syncFromGuest],
  );

  const clearCart = useCallback(async () => {
    setOperationLoading(true);
    try {
      if (isAuthenticated()) {
        const serverCart = await cartService.clearCart();
        applyCartState([], Number(serverCart.totalAmount ?? 0));
      } else {
        guestCartService.clearCart();
        syncFromGuest();
      }
    } finally {
      setOperationLoading(false);
    }
  }, [isAuthenticated, applyCartState, syncFromGuest]);

  const getItemQuantity = useCallback(
    (productId: string) => {
      const item = items.find((i) => i.product.id === productId);
      return item?.quantity ?? 0;
    },
    [items],
  );

  const increaseQuantity = useCallback(
    async (productId: string, delta = 1) => {
      setOperationLoading(true);
      setError(null);
      try {
        if (isAuthenticated()) {
          const serverCart = await cartService.increaseQuantity(
            productId,
            delta,
          );
          const lines = mapServerCartToLines(serverCart);
          applyCartState(
            serverLinesToCartItems(lines),
            Number(serverCart.totalAmount ?? 0),
          );
        } else {
          const current = guestCartService.getItemQuantity(productId);
          guestCartService.updateQuantity(productId, current + delta);
          syncFromGuest();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Cập nhật thất bại');
        throw err;
      } finally {
        setOperationLoading(false);
      }
    },
    [isAuthenticated, applyCartState, syncFromGuest],
  );

  const decreaseQuantity = useCallback(
    async (productId: string, delta = 1) => {
      setOperationLoading(true);
      setError(null);
      try {
        if (isAuthenticated()) {
          const serverCart = await cartService.decreaseQuantity(
            productId,
            delta,
          );
          const lines = mapServerCartToLines(serverCart);
          applyCartState(
            serverLinesToCartItems(lines),
            Number(serverCart.totalAmount ?? 0),
          );
        } else {
          const current = guestCartService.getItemQuantity(productId);
          guestCartService.updateQuantity(
            productId,
            Math.max(0, current - delta),
          );
          syncFromGuest();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Cập nhật thất bại');
        throw err;
      } finally {
        setOperationLoading(false);
      }
    },
    [isAuthenticated, applyCartState, syncFromGuest],
  );

  const removeItem = useCallback(
    async (productId: string) => {
      setOperationLoading(true);
      setError(null);
      try {
        if (isAuthenticated()) {
          const serverCart = await cartService.removeItem(productId);
          const lines = mapServerCartToLines(serverCart);
          applyCartState(
            serverLinesToCartItems(lines),
            Number(serverCart.totalAmount ?? 0),
          );
        } else {
          guestCartService.removeItem(productId);
          syncFromGuest();
        }
      } finally {
        setOperationLoading(false);
      }
    },
    [isAuthenticated, applyCartState, syncFromGuest],
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

  const selectSingleItem = useCallback(
    (productId: string) => {
      setSelectedProductIds(new Set([productId]));
    },
    [],
  );

  const updateQuantity = useCallback(
    async (productId: string, quantity: number) => {
      setOperationLoading(true);
      setError(null);
      try {
        if (isAuthenticated()) {
          const current = getItemQuantity(productId);
          if (current === 0) {
            if (quantity > 0) {
              const serverCart = await cartService.addToCart(productId, quantity);
              const lines = mapServerCartToLines(serverCart);
              applyCartState(
                serverLinesToCartItems(lines),
                Number(serverCart.totalAmount ?? 0),
              );
            }
          } else {
            const delta = quantity - current;
            if (delta > 0) {
              const serverCart = await cartService.increaseQuantity(productId, delta);
              const lines = mapServerCartToLines(serverCart);
              applyCartState(
                serverLinesToCartItems(lines),
                Number(serverCart.totalAmount ?? 0),
              );
            } else if (delta < 0) {
              const serverCart = await cartService.decreaseQuantity(productId, -delta);
              const lines = mapServerCartToLines(serverCart);
              applyCartState(
                serverLinesToCartItems(lines),
                Number(serverCart.totalAmount ?? 0),
              );
            }
          }
        } else {
          const current = guestCartService.getItemQuantity(productId);
          if (current === 0) {
            if (quantity > 0) {
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
            }
          } else {
            guestCartService.updateQuantity(productId, quantity);
          }
          syncFromGuest();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Cập nhật thất bại');
        throw err;
      } finally {
        setOperationLoading(false);
      }
    },
    [isAuthenticated, getItemQuantity, applyCartState, syncFromGuest],
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
      isGuestCart: !isAuthenticated(),
      addToCart,
      clearCart,
      getItemQuantity,
      refreshCart,
      increaseQuantity,
      decreaseQuantity,
      removeItem,
      toggleItemSelection,
      selectAllItems,
      selectSingleItem,
      updateQuantity,
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
      isAuthenticated,
      addToCart,
      clearCart,
      getItemQuantity,
      refreshCart,
      increaseQuantity,
      decreaseQuantity,
      removeItem,
      toggleItemSelection,
      selectAllItems,
      selectSingleItem,
      updateQuantity,
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

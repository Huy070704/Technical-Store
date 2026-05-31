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
  addToCart: (productId: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getItemQuantity: (productId: string) => number;
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

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(false);

  const syncFromGuest = useCallback(() => {
    const guestCart = guestCartService.getCart();
    setItems(guestItemsToCartItems(guestCart.items));
    setTotalAmount(guestCart.totalAmount);
  }, []);

  useEffect(() => {
    syncFromGuest();
  }, [syncFromGuest]);

  const addToCart = useCallback(
    async (productId: string, quantity: number) => {
      setLoading(true);
      try {
        const product = await productService.getProductById(productId);
        if (!product) {
          throw new Error('Không tìm thấy sản phẩm');
        }
        guestCartService.addToCart({
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.images?.[0]?.url,
          category: product.category?.name,
          stock: product.stock ?? 99,
        }, quantity);
        syncFromGuest();
      } finally {
        setLoading(false);
      }
    },
    [syncFromGuest],
  );

  const clearCart = useCallback(async () => {
    guestCartService.clearCart();
    syncFromGuest();
  }, [syncFromGuest]);

  const getItemQuantity = useCallback(
    (productId: string) => guestCartService.getItemQuantity(productId),
    [],
  );

  const value = useMemo(
    () => ({
      items,
      totalAmount,
      loading,
      addToCart,
      clearCart,
      getItemQuantity,
    }),
    [items, totalAmount, loading, addToCart, clearCart, getItemQuantity],
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

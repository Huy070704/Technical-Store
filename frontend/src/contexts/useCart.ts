import { useContext } from 'react';
import { CartContext } from './CartContext';
import type { CartContextValue } from './CartContext';

export type { CartContextValue };

export const useCart = (): CartContextValue => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart phải được dùng trong CartProvider');
  }
  return ctx;
};

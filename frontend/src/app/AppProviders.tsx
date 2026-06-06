import type { ReactNode } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { CartProvider } from '@/contexts/CartContext';
import { ToastProvider } from '@/contexts/ToastContext';

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <ToastProvider>
    <AuthProvider>
      <CartProvider>{children}</CartProvider>
    </AuthProvider>
  </ToastProvider>
);

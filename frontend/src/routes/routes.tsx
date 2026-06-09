import { createBrowserRouter, Navigate } from 'react-router-dom';
import {
  AuthLayout,
  ForgotPassword,
  Login,
  MainLayout,
  SignUp,
} from '@/components';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { HomePage } from '@/pages/HomePage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { CheckoutResultPage } from '@/pages/CheckoutResultPage';
import { OrderHistoryPage } from '@/pages/OrderHistoryPage';
import AllProductsPage from '@/pages/AllProductsPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import { WishlistPage } from '@/pages/WishlistPage';
import { AboutPage } from '@/pages/AboutPage';
import { ContactPage } from '@/pages/ContactPage';
import { UserDetailsPage } from '@/pages/UserDetailsPage';

import AdminProductManagement from '@/pages/admin/AdminProductManagement';
import AdminAccountManagement from '@/pages/admin/AdminAccountManagement';
import StaffDashboard from '@/pages/staff/StaffDashboard';
import ProtectedRoute from '@/components/shared/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'all-products',
        element: <AllProductsPage />,
      },
      {
        path: 'product/:productId',
        element: <ProductDetailPage />,
      },
      {
        path: 'wishlist',
        element: <WishlistPage />,
      },
      {
        path: 'about',
        element: <AboutPage />,
      },
      {
        path: 'contact',
        element: <ContactPage />,
      },
      {
        path: 'user/details',
        element: (
          <ProtectedRoute allowedRoles={['customer', 'admin', 'manager', 'staff']}>
            <UserDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'cart',
        element: <CartPage />,
      },
      {
        path: 'checkout',
        element: <CheckoutPage />,
      },
      {
        path: 'checkout/result',
        element: <CheckoutResultPage />,
      },
      {
        path: 'order-history',
        element: (
          <ProtectedRoute allowedRoles={['customer', 'admin', 'manager', 'staff']}>
            <OrderHistoryPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: '/admin/accounts',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'manager']}>
        <AdminAccountManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/products',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'manager']}>
        <AdminProductManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['staff']}>
        <StaffDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/login',
    element: (
      <AuthLayout>
        <Login />
      </AuthLayout>
    ),
  },
  {
    path: '/signup',
    element: (
      <AuthLayout>
        <SignUp />
      </AuthLayout>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <AuthLayout>
        <ForgotPassword />
      </AuthLayout>
    ),
  },
  {
    path: '/auth/callback',
    element: (
      <AuthLayout>
        <AuthCallbackPage />
      </AuthLayout>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

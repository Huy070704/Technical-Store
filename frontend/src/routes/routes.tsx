import { createBrowserRouter, Navigate } from 'react-router-dom';
import {
  AuthLayout,
  ForgotPassword,
  Login,
  MainLayout,
  SignUp,
} from '@/components';
import { HomePage } from '@/pages/HomePage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { CheckoutResultPage } from '@/pages/CheckoutResultPage';
import { OrderHistoryPage } from '@/pages/OrderHistoryPage';
import { GuestOrderLookupPage } from '@/pages/GuestOrderLookupPage';
import AllProductsPage from '@/pages/AllProductsPage';
import ProductDetailPage from '@/pages/ProductDetailPage';
import { WishlistPage } from '@/pages/WishlistPage';
import { AboutPage } from '@/pages/AboutPage';
import { ContactPage } from '@/pages/ContactPage';
import { UserDetailsPage } from '@/pages/UserDetailsPage';

import AdminProductManagement from '@/pages/admin/AdminProductManagement';
import AdminAccountManagement from '@/pages/admin/AdminAccountManagement';
import AdminRevenueManagement from '@/pages/admin/AdminRevenueManagement';
import AdminFacilityManagement from '@/pages/admin/AdminFacilityManagement';
import AdminInventoryOversight from '@/pages/admin/AdminInventoryOversight';
import StaffDashboard from '@/pages/staff/StaffDashboard';
import StaffOrderManagement from '@/pages/staff/StaffOrderManagement';
import StaffDeliveryManagement from '@/pages/staff/StaffDeliveryManagement';
import StaffInStoreOrderPage from '@/pages/staff/StaffInStoreOrderPage';
import StaffInvoicePage from '@/pages/staff/StaffInvoicePage';
import StaffPaymentPage from '@/pages/staff/StaffPaymentPage';
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
          <ProtectedRoute allowedRoles={['customer']}>
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
          <ProtectedRoute allowedRoles={['customer']}>
            <OrderHistoryPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'orders/lookup',
        element: <GuestOrderLookupPage />,
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
      <ProtectedRoute allowedRoles={['manager']}>
        <AdminProductManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'manager']}>
        <AdminRevenueManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/reports',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'manager']}>
        <AdminInventoryOversight />
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
    path: '/staff/orders',
    element: (
      <ProtectedRoute allowedRoles={['staff']}>
        <StaffOrderManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/deliveries',
    element: (
      <ProtectedRoute allowedRoles={['staff']}>
        <StaffDeliveryManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/instore',
    element: (
      <ProtectedRoute allowedRoles={['staff']}>
        <StaffInStoreOrderPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/invoices',
    element: (
      <ProtectedRoute allowedRoles={['staff']}>
        <StaffInvoicePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff/payments',
    element: (
      <ProtectedRoute allowedRoles={['staff']}>
        <StaffPaymentPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/revenue',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'manager']}>
        <AdminRevenueManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/facilities',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'manager']}>
        <AdminFacilityManagement />
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
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

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

import AdminProductManagement from '@/pages/admin/AdminProductManagement';
import AdminAccountManagement from '@/pages/admin/AdminAccountManagement';
import AdminRevenueManagement from '@/pages/admin/AdminRevenueManagement';
import AdminFacilityManagement from '@/pages/admin/AdminFacilityManagement';
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
    element: <AdminRevenueManagement />,
  },
  {
    path: '/admin/facilities',
    element: <AdminFacilityManagement />,
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

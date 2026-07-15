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
import { MyFeedbacksPage } from '@/pages/MyFeedbacksPage';

import ManagerProductManagement from '@/pages/manager/ManagerProductManagement';
import AdminAccountManagement from '@/pages/admin/AdminAccountManagement';
import AdminRevenueManagement from '@/pages/admin/AdminRevenueManagement';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminFacilityManagement from '@/pages/admin/AdminFacilityManagement';
import AdminInventoryOversight from '@/pages/admin/AdminInventoryOversight';
import ManagerFeedbackManagement from '@/pages/manager/ManagerFeedbackManagement';
import ManagerDashboard from '@/pages/manager/ManagerDashboard';
import AdminExportReport from '@/pages/admin/AdminExportReport';
import ManagerInventoryManagement from '@/pages/manager/ManagerInventoryManagement';
import ManagerStaffManagement from '@/pages/manager/ManagerStaffManagement';
import ManagerRevenueStats from '@/pages/manager/ManagerRevenueStats';
import ManagerOrderStats from '@/pages/manager/ManagerOrderStats';
import ManagerProductStats from '@/pages/manager/ManagerProductStats';
import ManagerCustomerStats from '@/pages/manager/ManagerCustomerStats';
import StaffDashboard from '@/pages/staff/StaffDashboard';
import StaffOrderManagement from '@/pages/staff/StaffOrderManagement';
import StaffDeliveryManagement from '@/pages/staff/StaffDeliveryManagement';
import StaffInStoreOrderPage from '@/pages/staff/StaffInStoreOrderPage';
import StaffInStoreOrderManagement from '@/pages/staff/StaffInStoreOrderManagement';
import StaffInvoicePage from '@/pages/staff/StaffInvoicePage';
import StaffPaymentPage from '@/pages/staff/StaffPaymentPage';
import StaffInventoryPage from '@/pages/staff/StaffInventoryPage';
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
        path: 'my-feedbacks',
        element: (
          <ProtectedRoute allowedRoles={['customer']}>
            <MyFeedbacksPage />
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
    path: '/manager/products',
    element: (
      <ProtectedRoute allowedRoles={['manager']}>
        <ManagerProductManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['admin', 'manager']}>
        <AdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/reports',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminInventoryOversight />
      </ProtectedRoute>
    ),
  },
  {
    path: '/manager/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['manager']}>
        <ManagerDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/manager/inventory',
    element: (
      <ProtectedRoute allowedRoles={['manager']}>
        <ManagerInventoryManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/manager/staff',
    element: (
      <ProtectedRoute allowedRoles={['manager']}>
        <ManagerStaffManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/manager/feedbacks',
    element: (
      <ProtectedRoute allowedRoles={['manager']}>
        <ManagerFeedbackManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/manager/stats/revenue',
    element: (
      <ProtectedRoute allowedRoles={['manager']}>
        <ManagerRevenueStats />
      </ProtectedRoute>
    ),
  },
  {
    path: '/manager/stats/orders',
    element: (
      <ProtectedRoute allowedRoles={['manager']}>
        <ManagerOrderStats />
      </ProtectedRoute>
    ),
  },
  {
    path: '/manager/stats/products',
    element: (
      <ProtectedRoute allowedRoles={['manager']}>
        <ManagerProductStats />
      </ProtectedRoute>
    ),
  },
  {
    path: '/manager/stats/customers',
    element: (
      <ProtectedRoute allowedRoles={['manager']}>
        <ManagerCustomerStats />
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
    path: '/staff/profile',
    element: (
      <ProtectedRoute allowedRoles={['staff']}>
        <UserDetailsPage />
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
    path: '/staff/instore-orders',
    element: (
      <ProtectedRoute allowedRoles={['staff']}>
        <StaffInStoreOrderManagement />
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
    path: '/staff/inventory',
    element: (
      <ProtectedRoute allowedRoles={['staff']}>
        <StaffInventoryPage />
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
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminFacilityManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/export-report',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AdminExportReport />
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

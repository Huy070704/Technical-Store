import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import {
  AuthLayout,
  MainLayout,
} from '@/components';
import { HomePage } from '@/pages/HomePage';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { PageLoader } from '@/components/shared';

// ── HOC bọc Suspense với module-level lazy ────────────────────────────
function withSuspense(LazyComponent: ComponentType) {
  return function SuspendedRoute() {
    return (
      <Suspense fallback={<PageLoader />}>
        <LazyComponent />
      </Suspense>
    );
  };
}

// Helper chọn named export cho lazy
function lazyNamed<T extends Record<string, ComponentType>>(
  importer: () => Promise<T>,
  name: keyof T & string,
) {
  return lazy(() => importer().then((mod) => ({ default: mod[name] as ComponentType })));
}

// ── Customer pages (module-level lazy) ─────────────────────────────────
const CartPage = withSuspense(lazyNamed(() => import('@/pages/CartPage'), 'CartPage'));
const CheckoutPage = withSuspense(lazyNamed(() => import('@/pages/CheckoutPage'), 'CheckoutPage'));
const CheckoutResultPage = withSuspense(lazyNamed(() => import('@/pages/CheckoutResultPage'), 'CheckoutResultPage'));
const OrderHistoryPage = withSuspense(lazyNamed(() => import('@/pages/OrderHistoryPage'), 'OrderHistoryPage'));
const GuestOrderLookupPage = withSuspense(lazyNamed(() => import('@/pages/GuestOrderLookupPage'), 'GuestOrderLookupPage'));
const AllProductsPage = withSuspense(lazy(() => import('@/pages/AllProductsPage')));
const ProductDetailPage = withSuspense(lazy(() => import('@/pages/ProductDetailPage')));
const WishlistPage = withSuspense(lazyNamed(() => import('@/pages/WishlistPage'), 'WishlistPage'));
const AboutPage = withSuspense(lazyNamed(() => import('@/pages/AboutPage'), 'AboutPage'));
const ContactPage = withSuspense(lazyNamed(() => import('@/pages/ContactPage'), 'ContactPage'));
const UserDetailsPage = withSuspense(lazyNamed(() => import('@/pages/UserDetailsPage'), 'UserDetailsPage'));
const MyFeedbacksPage = withSuspense(lazyNamed(() => import('@/pages/MyFeedbacksPage'), 'MyFeedbacksPage'));

// ── Auth pages (module-level lazy) ─────────────────────────────────────
const Login = withSuspense(lazyNamed(() => import('@/components/Login/Login'), 'Login'));
const SignUp = withSuspense(lazyNamed(() => import('@/components/Login/SignUp'), 'SignUp'));
const ForgotPassword = withSuspense(lazyNamed(() => import('@/components/Login/ForgotPassword'), 'ForgotPassword'));

// ── Admin pages (module-level lazy) ────────────────────────────────────
const AdminAccountManagement = withSuspense(lazy(() => import('@/pages/admin/AdminAccountManagement')));
const AdminRevenueManagement = withSuspense(lazy(() => import('@/pages/admin/AdminRevenueManagement')));
const AdminDashboard = withSuspense(lazy(() => import('@/pages/admin/AdminDashboard')));
const AdminFacilityManagement = withSuspense(lazy(() => import('@/pages/admin/AdminFacilityManagement')));
const AdminInventoryOversight = withSuspense(lazy(() => import('@/pages/admin/AdminInventoryOversight')));
const AdminExportReport = withSuspense(lazy(() => import('@/pages/admin/AdminExportReport')));

// ── Manager pages (module-level lazy) ──────────────────────────────────
const ManagerProductManagement = withSuspense(lazy(() => import('@/pages/manager/ManagerProductManagement')));
const ManagerFeedbackManagement = withSuspense(lazy(() => import('@/pages/manager/ManagerFeedbackManagement')));
const ManagerDashboard = withSuspense(lazy(() => import('@/pages/manager/ManagerDashboard')));
const ManagerInventoryManagement = withSuspense(lazy(() => import('@/pages/manager/ManagerInventoryManagement')));
const ManagerStaffManagement = withSuspense(lazy(() => import('@/pages/manager/ManagerStaffManagement')));
const ManagerRevenueStats = withSuspense(lazy(() => import('@/pages/manager/ManagerRevenueStats')));
const ManagerOrderStats = withSuspense(lazy(() => import('@/pages/manager/ManagerOrderStats')));
const ManagerProductStats = withSuspense(lazy(() => import('@/pages/manager/ManagerProductStats')));
const ManagerCustomerStats = withSuspense(lazy(() => import('@/pages/manager/ManagerCustomerStats')));

// ── Staff pages (module-level lazy) ────────────────────────────────────
const StaffDashboard = withSuspense(lazy(() => import('@/pages/staff/StaffDashboard')));
const StaffOrderManagement = withSuspense(lazy(() => import('@/pages/staff/StaffOrderManagement')));
const StaffDeliveryManagement = withSuspense(lazy(() => import('@/pages/staff/StaffDeliveryManagement')));
const StaffInStoreOrderPage = withSuspense(lazy(() => import('@/pages/staff/StaffInStoreOrderPage')));
const StaffInStoreOrderManagement = withSuspense(lazy(() => import('@/pages/staff/StaffInStoreOrderManagement')));
const StaffInvoicePage = withSuspense(lazy(() => import('@/pages/staff/StaffInvoicePage')));
const StaffPaymentPage = withSuspense(lazy(() => import('@/pages/staff/StaffPaymentPage')));

// ── Router ─────────────────────────────────────────────────────────────
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

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
    element: <AdminAccountManagement />,
  },
  {
    path: '/admin/products',
    element: <AdminProductManagement />,
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

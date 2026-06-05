import React from 'react';
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
import { useAuth } from '@/contexts/AuthContext';

import AdminProductManagement from '@/pages/admin/AdminProductManagement';
import AdminAccountManagement from '@/pages/admin/AdminAccountManagement';

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, token } = useAuth();
  
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  
  const roleSlug = typeof user.role === 'string' ? user.role : user.role?.slug || user.role?.name || '';
  const isAdmin = roleSlug.toLowerCase().includes('admin') || roleSlug.toLowerCase().includes('manager');
  
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

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
      <AdminRoute>
        <AdminAccountManagement />
      </AdminRoute>
    ),
  },
  {
    path: '/admin/products',
    element: (
      <AdminRoute>
        <AdminProductManagement />
      </AdminRoute>
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

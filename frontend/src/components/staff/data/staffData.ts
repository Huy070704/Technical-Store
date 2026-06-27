import type { AdminNavItem } from '@/components/admin/types';

export const staffNavItems: AdminNavItem[] = [
  { label: 'Dashboard',          icon: 'dashboard',      path: '/staff/dashboard' },
  { label: 'Quản lý đơn hàng',  icon: 'shopping_bag',   path: '/staff/orders' },
  { label: 'Giao hàng',         icon: 'local_shipping',  path: '/staff/deliveries' },
  { label: 'Bán tại quầy',      icon: 'storefront',      path: '/staff/instore' },
  { label: 'Hóa đơn',           icon: 'receipt_long',    path: '/staff/invoices' },
  { label: 'Thanh toán',        icon: 'payments',         path: '/staff/payments' },
  { label: 'Xuất kho',          icon: 'output',           path: '/staff/export' },
];

import type { AdminNavItem } from '@/components/admin/types';

export const staffNavItems: AdminNavItem[] = [
  { label: 'Dashboard',      icon: 'dashboard',        path: '/staff/dashboard' },
  { label: 'Online Orders',  icon: 'shopping_bag',     path: '/staff/orders' },
  { label: 'Deliveries',     icon: 'local_shipping',   path: '/staff/deliveries' },
  { label: 'In-store Sale',  icon: 'storefront',       path: '/staff/instore' },
  { label: 'Invoices',       icon: 'receipt_long',     path: '/staff/invoices' },
  { label: 'Payments',       icon: 'payments',         path: '/staff/payments' },
  { label: 'Export Goods',   icon: 'output',           path: '/staff/export' },
];

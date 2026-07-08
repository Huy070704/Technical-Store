import type { AdminNavItem } from '@/components/admin/types';

export const staffNavItems: AdminNavItem[] = [
  { label: 'Bảng điều khiển', icon: 'dashboard', path: '/staff/dashboard' },
  { label: 'Bán tại quầy', icon: 'storefront', path: '/staff/instore' },
  { label: 'Quản lý đơn tại quầy', icon: 'receipt_long', path: '/staff/instore-orders' },
  { label: 'Quản lý đơn online', icon: 'shopping_bag', path: '/staff/orders' },
  { label: 'Giao hàng', icon: 'local_shipping', path: '/staff/deliveries' },
  { label: 'Hóa đơn', icon: 'description', path: '/staff/invoices' },
  { label: 'Thanh toán', icon: 'payments', path: '/staff/payments' },
  { label: 'Tồn kho', icon: 'inventory_2', path: '/staff/inventory' },
];


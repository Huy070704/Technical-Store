import type { AdminNavItem, Product, ProductMetric } from '../types/admin';

export const adminNavItems: AdminNavItem[] = [
  { label: 'Bảng điều khiển', icon: 'dashboard', path: '/admin/dashboard' },
  { label: 'Sản phẩm', icon: 'inventory_2', path: '/admin/products', roles: ['manager'] },
  { label: 'Xuất hàng', icon: 'shopping_bag', path: '/admin/orders' },
  { label: 'Tài khoản', icon: 'group', path: '/admin/accounts' },
  { label: 'Doanh thu', icon: 'payments', path: '/admin/revenue' },
  { label: 'Chi nhánh', icon: 'domain', path: '/admin/facilities' },
  { label: 'Đánh giá', icon: 'rate_review', path: '/admin/feedbacks', roles: ['manager'] },
  { label: 'Báo cáo tồn kho', icon: 'analytics', path: '/admin/reports' },
];

export const productMetrics: ProductMetric[] = [
  {
    label: 'Total Products',
    value: '1,284',
    icon: 'inventory',
    tone: 'primary',
    meta: '+12%',
    metaTone: 'success',
  },
  {
    label: 'Low Stock Items',
    value: '24',
    icon: 'warning',
    tone: 'secondary',
    meta: 'Action Required',
    metaTone: 'danger',
  },
  {
    label: 'Out of Stock',
    value: '12',
    icon: 'trending_up',
    tone: 'success',
    meta: 'High Demand',
    metaTone: 'success',
  },
  {
    label: 'Total Value',
    value: '$45.2k',
    icon: 'attach_money',
    tone: 'neutral',
    meta: 'Inventory Value',
    metaTone: 'neutral',
  },
];

export const products: Product[] = [
  {
    id: 1,
    name: 'ProBook X1 Carbon',
    category: 'Laptops',
    sku: 'LAP-2024-001',
    price: 1299,
    stock: 142,
    status: 'Active',
    image: '/img/shop01.png',
  },
  {
    id: 2,
    name: 'RTX 5090 Graphics Card',
    category: 'Components',
    sku: 'GPU-5090-RTX',
    price: 1999.99,
    stock: 8,
    status: 'Low Stock',
    image: '/img/c1.png',
  },
  {
    id: 3,
    name: 'UltraWide 34" Monitor',
    category: 'Accessories',
    sku: 'MON-UW34-PRO',
    price: 549.5,
    stock: 0,
    status: 'Out of Stock',
    image: '/img/shop03.png',
  },
  {
    id: 4,
    name: 'MechKey v3 Wired',
    category: 'Accessories',
    sku: 'KEY-V3-WRD',
    price: 89,
    stock: 321,
    status: 'Active',
    image: '/img/c6.png',
  },
];

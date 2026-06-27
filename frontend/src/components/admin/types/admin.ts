export type ProductStatus = 'Active' | 'Archived';

export type AdminNavItem = {
  label: string;
  icon: string;
  active?: boolean;
  path?: string;
  roles?: string[];
};

export type ProductMetric = {
  label: string;
  value: string;
  icon: string;
  tone: 'primary' | 'secondary' | 'success' | 'neutral';
  meta: string;
  metaTone?: 'success' | 'danger' | 'neutral';
};

export type Product = {
  id: string | number;
  name: string;
  category: string;
  categoryId?: string;
  description?: string;
  sku: string;
  price: number;
  stock: number;
  status: ProductStatus;
  image: string;
  isActive?: boolean;
};

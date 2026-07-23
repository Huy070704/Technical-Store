export type ProductStatus = 'Active' | 'Low Stock' | 'Out of Stock' | 'Archived';

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
  tone: 'primary' | 'secondary' | 'success' | 'neutral' | 'danger';
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
  images?: { id?: string; url: string; originalName?: string }[];
  specifications?: Record<string, string>;
  isActive?: boolean;
};

export type ProductDetail = Omit<Product, "category"> & {
  category:
  | string
  | {
    id?: string;
    _id?: string;
    name: string;
    slug?: string;
  };

  [key: string]: any;
};

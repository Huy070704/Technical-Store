export interface ProductImage {
  id: string;
  url: string;
  originalName?: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  slug: string;
  price: number;
  description: string;
  stock: number;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  };
  images: ProductImage[];
  url?: string;
  [key: string]: unknown;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  message: string;
  error?: string;
  data?: T;
  products?: T;
  [key: string]: unknown;
}

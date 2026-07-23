export interface ProductImage {
  id: string;
  url: string;
  originalName?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export type ProductCategory = string;

export interface Product {
  id: string;
  name: string;
  price: number;
  stock?: number | null;
  description?: string;
  isActive?: boolean;
  category?: Category | null;
  categoryId?: string;
  images?: ProductImage[];
  url?: string;
  slug?: string;
  specifications?: Record<string, string>;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  [key: string]: unknown;
}

export interface SaveProductPayload {
  name: string;
  price: number;
  stock?: number;
  categoryId?: string;
  description?: string;
  imageUrl?: string;
  imageUrls?: string[];
  specifications?: Record<string, string>;
  isActive?: boolean;
}

export interface FilterState {
  categories: ProductCategory[];
  searchQuery: string;
  sortOrder: string;
}

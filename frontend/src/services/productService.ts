import { api } from './api';
import type { ApiResponse, Category, Product } from '@/types/product';

class ProductService {
  async getProductById(id: string): Promise<Product | null> {
    try {
      const response = await api.get<ApiResponse<{ product: Product }>>(`/products/${id}`);
      const data = response.data;
      if (data?.data && typeof data.data === 'object' && 'product' in data.data) {
        return (data.data as { product: Product }).product;
      }
      if (data && typeof data === 'object' && 'product' in data) {
        return (data as unknown as { product: Product }).product;
      }
      return null;
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }

  async getNewProducts(
    limit = 8,
  ): Promise<{ laptops: Product[]; pcs: Product[]; accessories: Product[] }> {
    try {
      const response = await api.get<
        ApiResponse<{ products: { laptops: Product[]; pcs: Product[]; accessories: Product[] } }>
      >(`/products/new?limit=${limit}`);
      const data = response.data;
      if (data?.data && typeof data.data === 'object' && 'products' in data.data) {
        return (data.data as { products: { laptops: Product[]; pcs: Product[]; accessories: Product[] } })
          .products;
      }
      return { laptops: [], pcs: [], accessories: [] };
    } catch (error) {
      console.error('Error fetching new products:', error);
      return { laptops: [], pcs: [], accessories: [] };
    }
  }

  async getTopSellingProducts(limit = 8): Promise<Product[]> {
    try {
      const response = await api.get<ApiResponse<{ products: Product[] }>>(
        `/products/top-selling?limit=${limit}`,
      );
      const data = response.data;
      if (data?.data && typeof data.data === 'object' && 'products' in data.data) {
        return (data.data as { products: Product[] }).products;
      }
      return [];
    } catch (error) {
      console.error('Error fetching top selling products:', error);
      return [];
    }
  }

  async searchProducts(keyword: string): Promise<Product[]> {
    try {
      const response = await api.get<ApiResponse<{ products: Product[] }>>(
        `/products/search?q=${encodeURIComponent(keyword)}`,
      );
      const data = response.data;
      if (data?.data && typeof data.data === 'object' && 'products' in data.data) {
        return (data.data as { products: Product[] }).products;
      }
      return [];
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  async getAllProducts(): Promise<Product[]> {
    try {
      const response = await api.get<ApiResponse<{ products: Product[] }>>('/products');
      const data = response.data;
      if (data?.data && typeof data.data === 'object' && 'products' in data.data) {
        return (data.data as { products: Product[] }).products;
      }
      return [];
    } catch (error) {
      console.error('Error fetching all products:', error);
      return [];
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const response = await api.get<ApiResponse<{ categories: Category[] }>>(
        '/products/categories/all',
      );
      const data = response.data;
      if (data?.data && typeof data.data === 'object' && 'categories' in data.data) {
        return (data.data as { categories: Category[] }).categories;
      }
      return [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }
}

export const productService = new ProductService();

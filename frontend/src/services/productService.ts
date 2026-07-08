import { api, unwrapApiData } from './api';
import type { Category, Product, SaveProductPayload } from '@/types/product';

type ProductsPayload = { products?: Product[]; message?: string };
type ProductPayload = { product?: Product; message?: string };
type CategoriesPayload = { categories?: Category[]; message?: string };
type NewProductsPayload = {
  products?: { laptops: Product[]; pcs: Product[]; accessories: Product[] };
};

const pickProducts = (data: ProductsPayload | undefined): Product[] =>
  Array.isArray(data?.products) ? data.products : [];

const pickProduct = (data: ProductPayload | undefined): Product | null =>
  data?.product ?? null;

const pickCategories = (data: CategoriesPayload | undefined): Category[] =>
  Array.isArray(data?.categories) ? data.categories : [];

class ProductService {
  async getAllProducts(): Promise<Product[]> {
    try {
      const response = await api.get('/products');
      const data = unwrapApiData<ProductsPayload>(response);
      return pickProducts(data);
    } catch (error) {
      console.error('Error fetching all products:', error);
      return [];
    }
  }

  /** Lấy sản phẩm theo tồn kho cơ sở của nhân viên đang đăng nhập (dùng cho bán hàng tại quầy). */
  async getStaffInstoreProducts(): Promise<Product[]> {
    try {
      const response = await api.get('/products/instore');
      const data = unwrapApiData<ProductsPayload>(response);
      return pickProducts(data);
    } catch (error) {
      console.error('Error fetching instore products:', error);
      return [];
    }
  }

  /** Lấy tất cả sản phẩm (kể cả hết hàng) với stock tại cơ sở của manager. */
  async getManagerProducts(): Promise<Product[]> {
    try {
      const response = await api.get('/products/manager/all');
      const data = unwrapApiData<ProductsPayload>(response);
      return pickProducts(data);
    } catch (error) {
      console.error('Error fetching manager products:', error);
      return [];
    }
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    try {
      const response = await api.get(`/products/category/${categoryId}`);
      const data = unwrapApiData<ProductsPayload>(response);
      return pickProducts(data);
    } catch (error) {
      console.error('Error fetching products by category:', error);
      return [];
    }
  }

  async getProductsByCategoryName(categoryName: string): Promise<Product[]> {
    try {
      const response = await api.get(`/products/category-name/${categoryName}`);
      const data = unwrapApiData<ProductsPayload>(response);
      return pickProducts(data);
    } catch (error) {
      console.error('Error fetching products by category name:', error);
      return [];
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      const response = await api.get('/products/categories/all');
      const data = unwrapApiData<CategoriesPayload>(response);
      return pickCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      const response = await api.get(`/products/${id}`);
      const data = unwrapApiData<ProductPayload>(response);
      return pickProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }

  async getNewProducts(
    limit = 8,
  ): Promise<{ laptops: Product[]; pcs: Product[]; accessories: Product[] }> {
    try {
      const response = await api.get(`/products/new?limit=${limit}`);
      const data = unwrapApiData<NewProductsPayload>(response);
      const grouped = data?.products;
      return {
        laptops: grouped?.laptops ?? [],
        pcs: grouped?.pcs ?? [],
        accessories: grouped?.accessories ?? [],
      };
    } catch (error) {
      console.error('Error fetching new products:', error);
      return { laptops: [], pcs: [], accessories: [] };
    }
  }

  async getTopSellingProducts(limit = 8): Promise<Product[]> {
    try {
      const response = await api.get(`/products/top-selling?limit=${limit}`);
      const data = unwrapApiData<ProductsPayload>(response);
      return pickProducts(data);
    } catch (error) {
      console.error('Error fetching top selling products:', error);
      return [];
    }
  }

  async searchProducts(keyword: string): Promise<Product[]> {
    try {
      const response = await api.get(
        `/products/search?q=${encodeURIComponent(keyword)}`,
      );
      const data = unwrapApiData<ProductsPayload>(response);
      return pickProducts(data);
    } catch (error) {
      console.error('Error searching products:', error);
      try {
        const allProducts = await this.getAllProducts();
        const keywordLower = keyword.toLowerCase();
        return allProducts.filter(
          (product) =>
            product.name.toLowerCase().includes(keywordLower) ||
            (product.category?.name || '')
              .toLowerCase()
              .includes(keywordLower) ||
            (product.description || '').toLowerCase().includes(keywordLower),
        );
      } catch {
        return [];
      }
    }
  }

  async getProductsByType(
    type: 'laptop' | 'pc' | 'accessories',
    limit = 8,
  ): Promise<Product[]> {
    try {
      const response = await api.get(`/products/type/${type}?limit=${limit}`);
      const data = unwrapApiData<ProductsPayload>(response);
      return pickProducts(data);
    } catch (error) {
      console.error(`Error fetching products by type ${type}:`, error);
      return [];
    }
  }

  async createProduct(payload: SaveProductPayload): Promise<Product> {
    const body = {
      ...payload,
      url: payload.imageUrl,
    };
    const response = await api.post('/products', body);
    const data = unwrapApiData<ProductPayload>(response);
    const product = pickProduct(data);
    if (product) return product;
    throw new Error('Invalid create product response');
  }

  async updateProduct(id: string, payload: SaveProductPayload): Promise<Product> {
    const body = {
      ...payload,
      url: payload.imageUrl,
    };
    const response = await api.patch(`/products/${id}`, body);
    const data = unwrapApiData<ProductPayload>(response);
    const product = pickProduct(data);
    if (product) return product;
    throw new Error('Invalid update product response');
  }

  async attachImageToProduct(productId: string, imageUrl: string): Promise<void> {
    await api.post('/image/attach-to-product', {
      query: productId,
      imagesURL: imageUrl,
    });
  }

  async deleteProduct(id: string): Promise<void> {
    await api.delete(`/products/${id}`);
  }
}

export const productService = new ProductService();

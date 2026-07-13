import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  AdminLayout,
  MetricCard,
  PageHeader,
  ProductFilters,
  ProductFormModal,
  ProductTable,
  ProductDetailModal,
  ConfirmModal,
} from '../../components/admin';
import { productService } from '@/services/productService';

import type { Product as AdminProduct, ProductMetric, ProductStatus } from '@/components/admin/types';
import type { Category, Product, SaveProductPayload } from '@/types/product';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const LOW_STOCK_THRESHOLD = 10;
const PAGE_SIZE = 10;
const FALLBACK_PRODUCT_IMAGE = '/img/logo.png';

type FilterState = {
  search: string;
  category: string;
  status: string;
  sortBy: string;
};

const getProductStatus = (product: Product): ProductStatus => {
  const stock = Number(product.stock ?? 0);

  if (!product.isActive) return 'Archived';
  if (stock <= 0) return 'Out of Stock';
  if (stock < LOW_STOCK_THRESHOLD) return 'Low Stock';
  return 'Active';
};

const getProductSku = (product: Product): string => {
  if (typeof product.sku === 'string' && product.sku.trim()) {
    return product.sku;
  }

  const prefix = product.category?.slug?.slice(0, 3) || product.slug?.slice(0, 3) || 'prd';
  return `${prefix}-${product.id.slice(0, 8)}`.toUpperCase();
};

const getProductImage = (product: Product): string => {
  const image = product.images?.[0]?.url || product.url;
  return typeof image === 'string' && image.trim() ? image : FALLBACK_PRODUCT_IMAGE;
};

const formatMetricCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    currency: 'VND',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);

const getCategoryId = (product: Product): string => {
  const cat = product.category;
  const catId = product.categoryId;

  if (catId) {
    if (typeof catId === 'object' && catId !== null) {
      const obj = catId as any;
      return obj.id || obj._id || '';
    }
    return String(catId);
  }

  if (cat) {
    if (typeof cat === 'object') {
      return cat.id || (cat as any)._id || '';
    }
    return String(cat);
  }

  return '';
};

const mapToAdminProduct = (product: Product): AdminProduct => ({
  id: product.id,
  name: product.name,
  category: product.category?.name || 'Uncategorized',
  categoryId: getCategoryId(product),
  description: product.description,
  sku: getProductSku(product),
  price: Number(product.price ?? 0),
  stock: Number(product.stock ?? 0),
  status: getProductStatus(product),
  image: getProductImage(product),
  images: product.images?.map(img => ({ id: img.id, url: img.url })),
  specifications: product.specifications as Record<string, string> | undefined,
  isActive: product.isActive,
});

const buildMetrics = (products: AdminProduct[], facilityName: string): ProductMetric[] => {
  const totalProducts = products.length;
  const lowStockItems = products.filter((p) => p.status === 'Low Stock').length;
  const outOfStockItems = products.filter((p) => p.status === 'Out of Stock').length;
  const totalValue = products.reduce((sum, p) => sum + p.price * p.stock, 0);

  return [
    {
      label: 'Tổng sản phẩm',
      value: totalProducts.toLocaleString('vi-VN'),
      icon: 'inventory',
      tone: 'primary',
      meta: facilityName || 'Cơ sở của bạn',
      metaTone: 'neutral',
    },
    {
      label: 'Sắp hết hàng',
      value: lowStockItems.toLocaleString('vi-VN'),
      icon: 'warning',
      tone: 'secondary',
      meta: lowStockItems > 0 ? 'Cần xử lý' : 'Tồn kho ổn',
      metaTone: lowStockItems > 0 ? 'danger' : 'success',
    },
    {
      label: 'Hết hàng',
      value: outOfStockItems.toLocaleString('vi-VN'),
      icon: 'inventory_2',
      tone: outOfStockItems > 0 ? 'secondary' : 'success',
      meta: outOfStockItems > 0 ? 'Cần nhập thêm' : 'Còn hàng',
      metaTone: outOfStockItems > 0 ? 'danger' : 'success',
    },
    {
      label: 'Tổng giá trị',
      value: formatMetricCurrency(totalValue),
      icon: 'attach_money',
      tone: 'neutral',
      meta: 'Giá trị kho cơ sở',
      metaTone: 'neutral',
    },
  ];
};

const ManagerProductManagement = () => {
  const { user } = useAuth();
  const toast = useToast();

  const facilityName = useMemo(() => {
    if (!user?.facility) return '';
    return typeof user.facility === 'object'
      ? (user.facility as any).name || ''
      : '';
  }, [user?.facility]);

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [viewingProduct, setViewingProduct] = useState<AdminProduct | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<AdminProduct | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    status: '',
    sortBy: '',
  });

  const deferredFilters = useDeferredValue(filters);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');

      const [productData, categoryData] = await Promise.all([
        productService.getManagerProducts(),
        productService.getCategories(),
      ]);

      setProducts(productData.map(mapToAdminProduct));
      setCategories(categoryData);
    } catch (err) {
      setError('Không thể tải sản phẩm. Vui lòng thử lại sau.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  const categoryOptions = useMemo(() => {
    const backendCategories = categories.map((c) => c.name).filter(Boolean);
    const productCategories = products.map((p) => p.category).filter(Boolean);
    return Array.from(new Set([...backendCategories, ...productCategories])).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [categories, products]);

  const metrics = useMemo(() => buildMetrics(products, facilityName), [products, facilityName]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const keyword = deferredFilters.search.trim().toLowerCase();
        const matchesSearch = keyword
          ? product.name.toLowerCase().includes(keyword) || product.sku.toLowerCase().includes(keyword)
          : true;
        const matchesCategory = deferredFilters.category
          ? product.category === deferredFilters.category
          : true;
        const matchesStatus = deferredFilters.status ? product.status === deferredFilters.status : true;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        switch (deferredFilters.sortBy) {
          case 'name-asc':
            return a.name.localeCompare(b.name);
          case 'name-desc':
            return b.name.localeCompare(a.name);
          case 'price-asc':
            return a.price - b.price;
          case 'price-desc':
            return b.price - a.price;
          default:
            return 0;
        }
      });
  }, [deferredFilters, products]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredProducts.slice(startIndex, startIndex + PAGE_SIZE);
  }, [currentPage, filteredProducts]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredFilters.search, deferredFilters.category, deferredFilters.status, deferredFilters.sortBy]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openAddForm = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const openEditForm = async (product: AdminProduct) => {
    const detail = await productService.getProductByIdForAdmin(String(product.id));

    setEditingProduct(detail as any);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = async (payload: SaveProductPayload) => {
    const isEditing = !!editingProduct;
    try {
      setSaving(true);
      setError('');

      const savedProduct = isEditing
        ? await productService.updateProduct(String(editingProduct.id), payload)
        : await productService.createProduct(payload);

      // Attach images if provided
      const urlsToAttach = payload.imageUrls && payload.imageUrls.length > 0
        ? payload.imageUrls
        : payload.imageUrl ? [payload.imageUrl] : [];
      if (urlsToAttach.length > 0) {
        try {
          await productService.attachImageToProduct(String(savedProduct.id), urlsToAttach.join(','));
          savedProduct.images = urlsToAttach.map(url => ({ id: '', url }));
        } catch (imageErr) {
          console.error('Failed to attach images to product:', imageErr);
        }
      }

      const mappedProduct = mapToAdminProduct(savedProduct);

      setProducts((currentProducts) => {
        if (!editingProduct) {
          return [mappedProduct, ...currentProducts];
        }
        return currentProducts.map((p) => {
          if (String(p.id) === String(mappedProduct.id)) {
            const preservedStock = p.stock;
            const updatedStatus = getProductStatus({
              ...savedProduct,
              stock: preservedStock,
            });
            return {
              ...mappedProduct,
              stock: preservedStock,
              status: updatedStatus,
            };
          }
          return p;
        });
      });
      setIsFormOpen(false);
      setEditingProduct(null);
      setCurrentPage(1);

      toast.success(isEditing ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm thành công!');
    } catch (err) {
      const apiError = err as ApiError;
      const errMsg =
        apiError?.response?.data?.message ||
        (isEditing ? 'Cập nhật sản phẩm thất bại.' : 'Thêm sản phẩm thất bại.');
      setError(errMsg);
      toast.error(errMsg);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = (product: AdminProduct) => {
    setConfirmTarget(product);
    setIsConfirmOpen(true);
  };

  const handleResetFilters = () => {
    setFilters({ search: '', category: '', status: '', sortBy: '' });
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    try {
      setConfirmLoading(true);
      setError('');
      await productService.deleteProduct(String(confirmTarget.id));
      setProducts((currentProducts) =>
        currentProducts.filter((p) => String(p.id) !== String(confirmTarget.id)),
      );
      setIsConfirmOpen(false);
      setConfirmTarget(null);
      toast.success('Xóa sản phẩm thành công!');
    } catch (err) {
      const apiError = err as ApiError;
      const errMsg = apiError?.response?.data?.message || 'Xóa sản phẩm thất bại.';
      setError(errMsg);
      toast.error(errMsg);
      console.error(err);
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          actionLabel="Thêm sản phẩm"
          description={
            facilityName
              ? `Quản lý kho hàng và mức tồn kho tại cơ sở ${facilityName}.`
              : 'Quản lý kho hàng, giá cả và mức tồn kho tại cơ sở của bạn.'
          }
          onActionClick={openAddForm}
          title="Quản Lý Sản Phẩm"
        />

        {/* Facility badge */}
        {facilityName && (
          <div className="flex items-center gap-sm rounded-xl border border-primary/20 bg-primary/5 px-md py-sm w-fit">
            <MaterialIcon name="domain" className="text-primary text-[18px]" />
            <span className="text-body-sm font-semibold text-primary">
              Cơ sở: <span className="font-bold">{facilityName}</span>
            </span>
          </div>
        )}

        <section className="grid grid-cols-1 gap-lg md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        {error && <div className="rounded-lg bg-error-container p-md text-error">{error}</div>}

        <ProductFilters
          categories={categoryOptions}
          filters={filters}
          onFilterChange={setFilters}
          onReset={handleResetFilters}
        />

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-slate-border/30 bg-bg-card shadow-sm">
            <div className="text-secondary animate-pulse">Đang tải sản phẩm...</div>
          </div>
        ) : (
          <ProductTable
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            products={paginatedProducts}
            totalCount={filteredProducts.length}
            onView={setViewingProduct}
            onEdit={openEditForm}
            onPageChange={setCurrentPage}
          />
        )}

        {viewingProduct && (
          <ProductDetailModal
            product={viewingProduct}
            onClose={() => setViewingProduct(null)}
          />
        )}

        {isFormOpen && (
          <ProductFormModal
            categories={categories}
            product={editingProduct}
            saving={saving}
            onClose={closeForm}
            onSubmit={handleSaveProduct}
          />
        )}

        {isConfirmOpen && confirmTarget && (
          <ConfirmModal
            isOpen={isConfirmOpen}
            title="Xóa sản phẩm"
            message={`Bạn có chắc chắn muốn xóa sản phẩm "${confirmTarget.name}"? Hành động này không thể hoàn tác.`}
            confirmLabel="Xóa"
            cancelLabel="Hủy"
            confirmTone="error"
            icon="delete"
            loading={confirmLoading}
            onConfirm={handleConfirmDelete}
            onCancel={() => {
              setIsConfirmOpen(false);
              setConfirmTarget(null);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default ManagerProductManagement;

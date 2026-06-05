import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  AdminLayout,
  MetricCard,
  PageHeader,
  ProductFilters,
  ProductFormModal,
  ProductTable,
  ConfirmModal,
} from '../../components/admin';
import { productService } from '@/services/productService';
import type { Product as AdminProduct, ProductMetric, ProductStatus } from '@/components/admin/types';
import type { Category, Product, SaveProductPayload } from '@/types/product';

const LOW_STOCK_THRESHOLD = 20;
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
  new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);

const mapToAdminProduct = (product: Product): AdminProduct => ({
  id: product.id,
  name: product.name,
  category: product.category?.name || 'Uncategorized',
  categoryId: product.categoryId || product.category?.id,
  description: product.description,
  sku: getProductSku(product),
  price: Number(product.price ?? 0),
  stock: Number(product.stock ?? 0),
  status: getProductStatus(product),
  image: getProductImage(product),
  isActive: product.isActive,
});

const buildMetrics = (products: AdminProduct[]): ProductMetric[] => {
  const totalProducts = products.length;
  const lowStockItems = products.filter((product) => product.status === 'Low Stock').length;
  const outOfStockItems = products.filter((product) => product.status === 'Out of Stock').length;
  const totalValue = products.reduce((sum, product) => sum + product.price * product.stock, 0);

  return [
    {
      label: 'Total Products',
      value: totalProducts.toLocaleString('en-US'),
      icon: 'inventory',
      tone: 'primary',
      meta: 'Total product',
      metaTone: 'neutral',
    },
    {
      label: 'Low Stock Items',
      value: lowStockItems.toLocaleString('en-US'),
      icon: 'warning',
      tone: 'secondary',
      meta: lowStockItems > 0 ? 'Action Required' : 'Stock Healthy',
      metaTone: lowStockItems > 0 ? 'danger' : 'success',
    },
    {
      label: 'Out of Stock',
      value: outOfStockItems.toLocaleString('en-US'),
      icon: 'inventory_2',
      tone: 'success',
      meta: outOfStockItems > 0 ? 'Needs Restock' : 'Available',
      metaTone: outOfStockItems > 0 ? 'danger' : 'success',
    },
    {
      label: 'Total Value',
      value: formatMetricCurrency(totalValue),
      icon: 'attach_money',
      tone: 'neutral',
      meta: 'Inventory Value',
      metaTone: 'neutral',
    },
  ];
};

const AdminProductManagement = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
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
          productService.getAllProducts(),
          productService.getCategories(),
        ]);

        setProducts(productData.map(mapToAdminProduct));
        setCategories(categoryData);
      } catch (err) {
        setError('Failed to load products from backend');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    void fetchProducts();
  }, []);

  const categoryOptions = useMemo(() => {
    const backendCategories = categories.map((category) => category.name).filter(Boolean);
    const productCategories = products.map((product) => product.category).filter(Boolean);
    return Array.from(new Set([...backendCategories, ...productCategories])).sort((a, b) =>
      a.localeCompare(b),
    );
  }, [categories, products]);

  const metrics = useMemo(() => buildMetrics(products), [products]);

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

  const openEditForm = (product: AdminProduct) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = async (payload: SaveProductPayload) => {
    try {
      setSaving(true);
      setError('');

      const savedProduct = editingProduct
        ? await productService.updateProduct(String(editingProduct.id), payload)
        : await productService.createProduct(payload);
      const mappedProduct = mapToAdminProduct(savedProduct);

      setProducts((currentProducts) => {
        if (!editingProduct) {
          return [mappedProduct, ...currentProducts];
        }

        return currentProducts.map((product) =>
          String(product.id) === String(mappedProduct.id) ? mappedProduct : product,
        );
      });
      setIsFormOpen(false);
      setEditingProduct(null);
      setCurrentPage(1);
    } catch (err) {
      setError('Failed to save product');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = (product: AdminProduct) => {
    setConfirmTarget(product);
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    try {
      setConfirmLoading(true);
      setError('');
      await productService.deleteProduct(String(confirmTarget.id));
      setProducts((currentProducts) =>
        currentProducts.filter((currentProduct) => String(currentProduct.id) !== String(confirmTarget.id)),
      );
      setIsConfirmOpen(false);
      setConfirmTarget(null);
    } catch (err) {
      setError('Failed to delete product');
      console.error(err);
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          actionLabel="Add Product"
          description="Manage your inventory, pricing, and stock levels."
          onActionClick={openAddForm}
          title="Product Management"
        />

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
        />

        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-slate-border/50 bg-bg-card">
            <div className="text-secondary">Loading products...</div>
          </div>
        ) : (
          <ProductTable
            currentPage={currentPage}
            pageSize={PAGE_SIZE}
            products={paginatedProducts}
            totalCount={filteredProducts.length}
            onDelete={handleDeleteProduct}
            onEdit={openEditForm}
            onPageChange={setCurrentPage}
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
            title="Delete Product"
            message={`Are you sure you want to delete product "${confirmTarget.name}"? This action cannot be undone.`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
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

export default AdminProductManagement;

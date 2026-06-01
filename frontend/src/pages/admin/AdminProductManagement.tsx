import { useState, useMemo, useDeferredValue } from 'react'; // 1. Thêm useDeferredValue
import { 
  AdminLayout, 
  MetricCard, 
  PageHeader, 
  ProductFilters, 
  ProductTable, 
  productMetrics, 
  products 
} from '../../components/admin';

const AdminProductManagement = () => {
  // State lưu trữ các giá trị bộ lọc gốc
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
    sortBy: '',
  });

  // 2. Tạo một bản sao "trì hoãn" của filters. 
  // Khi bạn gõ nhanh, deferredFilters sẽ đợi bạn gõ xong mới cập nhật.
  const deferredFilters = useDeferredValue(filters);

  // 3. Thay vì dùng `filters`, ta dùng `deferredFilters` để tính toán sản phẩm
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        // Tìm kiếm bằng giá trị đã hoãn
        const matchesSearch =
          product.name.toLowerCase().includes(deferredFilters.search.toLowerCase()) ||
          product.sku.toLowerCase().includes(deferredFilters.search.toLowerCase());

        const matchesCategory = deferredFilters.category ? product.category === deferredFilters.category : true;
        const matchesStatus = deferredFilters.status ? product.status === deferredFilters.status : true;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort((a, b) => {
        if (!deferredFilters.sortBy) return 0;

        switch (deferredFilters.sortBy) {
          case 'name-asc': return a.name.localeCompare(b.name);
          case 'name-desc': return b.name.localeCompare(a.name);
          case 'price-asc': return a.price - b.price;
          case 'price-desc': return b.price - a.price;
          default: return 0;
        }
      });
  }, [deferredFilters]); // Chỉ tính toán lại khi deferredFilters thay đổi

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          actionLabel="Add Product"
          description="Manage your inventory, pricing, and stock levels."
          title="Product Management"
        />

        {/* Section này chứa các thẻ Card tĩnh, không cần tính toán lại theo bộ lọc */}
        <section className="grid grid-cols-1 gap-lg md:grid-cols-2 xl:grid-cols-4">
          {productMetrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        {/* 4. Vẫn truyền `filters` gốc xuống đây để ô Input cập nhật ký tự ngay lập tức (không bị hoãn hành động gõ) */}
        <ProductFilters filters={filters} onFilterChange={setFilters} />

        {/* Bảng sẽ nhận mảng đã tối ưu mượt mà */}
        <ProductTable products={filteredProducts} />
      </div>
    </AdminLayout>
  );
};

export default AdminProductManagement;
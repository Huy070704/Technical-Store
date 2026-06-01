import MaterialIcon from '../shared/MaterialIcon';

// 1. Định nghĩa kiểu dữ liệu cho các trường filter
interface FilterState {
  search: string;
  category: string;
  status: string;
  sortBy: string;
}

// 2. Định nghĩa kiểu dữ liệu cho Props của Component
interface ProductFiltersProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
}

// 3. Áp dụng kiểu dữ liệu vào component
const ProductFilters = ({ filters, onFilterChange }: ProductFiltersProps) => {
  
  // Định nghĩa kiểu dữ liệu React.ChangeEvent cho sự kiện thay đổi của input/select
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange({
      ...filters,
      [name]: value,
    });
  };

  return (
    <section className="flex flex-col items-center gap-md rounded-xl border border-slate-border/50 bg-bg-card p-md shadow-md md:flex-row">
      
      {/* 1. THANH TÌM KIẾM */}
      <div className="relative w-full flex-1">
        <MaterialIcon name="search" className="absolute left-md top-1/2 -translate-y-1/2 text-secondary" />
        <input
          name="search"
          value={filters.search || ''}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-border bg-surface-container-low py-sm pl-xl pr-md text-body-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Search product name or SKU..."
          type="text"
        />
      </div>

      {/* 2. BỘ LỌC & SẮP XẾP */}
      <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-3 md:w-auto">
        
        {/* Lọc Theo Danh Mục */}
        <select 
          name="category"
          value={filters.category || ''}
          onChange={handleChange}
          className="min-w-0 rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-44"
        >
          <option value="">All Categories</option>
          <option value="Laptops">Laptops</option>
          <option value="Desktops">Desktops</option>
          <option value="Components">Components</option>
          <option value="Accessories">Accessories</option>
        </select>

        {/* Lọc Theo Trạng Thái */}
        <select 
          name="status"
          value={filters.status || ''}
          onChange={handleChange}
          className="min-w-0 rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-44"
        >
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
          <option value="Archived">Archived</option>
        </select>

        {/* Ô SẮP XẾP MỚI THÊM */}
        <select 
          name="sortBy"
          value={filters.sortBy || ''}
          onChange={handleChange}
          className="min-w-0 rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-44"
        >
          <option value="">Sort By</option>
          <option value="name-asc">Name: A to Z</option>
          <option value="name-desc">Name: Z to A</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
        </select>

      </div>
    </section>
  );
};

export default ProductFilters;
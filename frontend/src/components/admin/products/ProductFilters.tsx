import type { ChangeEvent } from 'react';
import MaterialIcon from '../shared/MaterialIcon';

interface FilterState {
  search: string;
  category: string;
  status: string;
  sortBy: string;
}

interface ProductFiltersProps {
  filters: FilterState;
  categories?: string[];
  onFilterChange: (newFilters: FilterState) => void;
  onReset: () => void;
}

const ProductFilters = ({ filters, categories = [], onFilterChange, onReset }: ProductFiltersProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    onFilterChange({
      ...filters,
      [name]: value,
    });
  };

  const hasActiveFilters = filters.search || filters.category || filters.status || filters.sortBy;

  return (
    <section className="flex flex-col items-center gap-md rounded-xl border border-slate-border/50 bg-bg-card p-md shadow-md md:flex-row">
      <div className="relative w-full flex-1">
        <MaterialIcon name="search" className="absolute left-md top-1/2 -translate-y-1/2 text-secondary" />
        <input
          name="search"
          value={filters.search || ''}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-border bg-surface-container-low py-sm pl-xl pr-md text-body-sm transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="Tìm theo tên sản phẩm hoặc SKU..."
          type="text"
        />
      </div>

      <div className="flex w-full flex-col gap-md sm:flex-row md:w-auto">
        <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
          <select
            name="category"
            value={filters.category || ''}
            onChange={handleChange}
            className="min-w-0 rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-44"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            name="status"
            value={filters.status || ''}
            onChange={handleChange}
            className="min-w-0 rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-44"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="Active">Đang bán</option>
            <option value="Low Stock">Sắp hết hàng</option>
            <option value="Out of Stock">Hết hàng</option>
            <option value="Archived">Ngừng kinh doanh</option>
          </select>

          <select
            name="sortBy"
            value={filters.sortBy || ''}
            onChange={handleChange}
            className="min-w-0 rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-44"
          >
            <option value="">Sắp xếp theo</option>
            <option value="name-asc">Tên: A → Z</option>
            <option value="name-desc">Tên: Z → A</option>
            <option value="price-asc">Giá: Thấp → Cao</option>
            <option value="price-desc">Giá: Cao → Thấp</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center justify-center gap-xs rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm font-medium text-secondary transition-all hover:bg-slate-100 active:scale-95"
            title="Xóa tất cả bộ lọc"
          >
            <MaterialIcon name="restart_alt" className="text-sm" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </section>
  );
};

export default ProductFilters;

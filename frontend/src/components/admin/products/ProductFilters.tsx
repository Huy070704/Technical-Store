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
}

const ProductFilters = ({ filters, categories = [], onFilterChange }: ProductFiltersProps) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    onFilterChange({
      ...filters,
      [name]: value,
    });
  };

  return (
    <section className="flex flex-col items-center gap-md rounded-xl border border-slate-border/50 bg-bg-card p-md shadow-md md:flex-row">
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

      <div className="grid w-full grid-cols-1 gap-md sm:grid-cols-3 md:w-auto">
        <select
          name="category"
          value={filters.category || ''}
          onChange={handleChange}
          className="min-w-0 rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 md:w-44"
        >
          <option value="">All Categories</option>
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
          <option value="">All Status</option>
          <option value="Active">Active</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
          <option value="Archived">Archived</option>
        </select>

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

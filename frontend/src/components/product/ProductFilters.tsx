import React, { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { FilterState, Category, ProductCategory } from "@/types/product";
import { productService } from "@/services/productService";

interface ProductFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  categoryCounts?: Record<string, number>;
}

const CATEGORY_FILTERS_ORDER = [
  "laptop",
  "pc",
  "drive",
  "monitor",
  "cpu",
  "cooler",
  "ram",
  "psu",
  "case",
  "headset",
  "motherboard",
  "keyboard",
  "gpu",
  "mouse",
  "network-card",
];

const ProductFilters: React.FC<ProductFiltersProps> = ({
  filters,
  onFiltersChange,
  categoryCounts = {},
}) => {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const cats = await productService.getCategories();
      setCategories(cats);
    };
    fetchCategories();
  }, []);

  const handleCategoryToggle = (categorySlug: string) => {
    const catSlug = categorySlug as ProductCategory;
    if (!catSlug) return;
    const isSelected = filters.categories.includes(catSlug);
    const newCategories = isSelected
      ? filters.categories.filter((slug) => slug !== catSlug)
      : [...filters.categories, catSlug];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const handleClear = () => {
    onFiltersChange({ ...filters, categories: [] });
  };

  const sortedCategories = [...categories].sort((a, b) => {
    const idxA = CATEGORY_FILTERS_ORDER.indexOf(a.slug.toLowerCase());
    const idxB = CATEGORY_FILTERS_ORDER.indexOf(b.slug.toLowerCase());
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  const activeCount = filters.categories.length;

  return (
    <aside className="rounded-2xl border border-slate-border/80 bg-bg-card shadow-[0_4px_24px_rgba(11,28,48,0.04)] overflow-hidden">
      <div className="border-b border-slate-border/80 bg-gradient-to-r from-primary/5 to-transparent px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-light text-primary">
              <SlidersHorizontal className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-on-surface">Bộ lọc</h2>
              <p className="text-[11px] text-secondary">Theo loại sản phẩm</p>
            </div>
          </div>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
            >
              <X className="h-3 w-3" />
              Xóa ({activeCount})
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[min(520px,calc(100vh-220px))] overflow-y-auto p-4 md:p-5 [scrollbar-width:thin]">
        <ul className="space-y-1">
          {sortedCategories.map((cat) => {
            const selected = filters.categories.includes(cat.slug as ProductCategory);
            const count = categoryCounts[cat.slug] || 0;
            return (
              <li key={cat.id}>
                <label
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-all ${
                    selected
                      ? "bg-primary-light/80 ring-1 ring-primary/20"
                      : "hover:bg-surface-container-low"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => handleCategoryToggle(cat.slug)}
                      className="h-4 w-4 shrink-0 rounded accent-primary"
                    />
                    <span
                      className={`truncate text-sm ${
                        selected ? "font-semibold text-primary" : "text-on-surface"
                      }`}
                    >
                      {cat.name}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                      selected
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container-low text-secondary"
                    }`}
                  >
                    {count}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};

export default ProductFilters;

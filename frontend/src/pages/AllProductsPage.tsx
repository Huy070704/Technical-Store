import React, { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Search,
  ChevronRight,
  LayoutGrid,
  PackageSearch,
} from "lucide-react";
import ProductFilters from "@/components/product/ProductFilters";
import { BrowseProductCard } from "@/components/product/BrowseProductCard";
import Pagination from "@/components/product/Pagination";
import { LoadingIndicator, ProductGridSkeleton } from "@/components/shared";
import { productService } from "@/services/productService";
import type { Product, FilterState, ProductCategory } from "@/types/product";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/contexts/CartContext";

const PRODUCTS_PER_PAGE = 20;

const defaultFilters: FilterState = {
  categories: [],
  searchQuery: "",
  sortOrder: "none",
};

const sortLabels: Record<string, string> = {
  none: "Mặc định",
  asc: "Giá thấp → cao",
  desc: "Giá cao → thấp",
};

const AllProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [addToCartStatus, setAddToCartStatus] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const location = useLocation();
  const { addToCart } = useCart();

  useEffect(() => {
    if (addToCartStatus) {
      const timer = setTimeout(() => setAddToCartStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [addToCartStatus]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        if (location.state?.searchResults) {
          setProducts(location.state.searchResults);
          setFilters((prev) => ({
            ...prev,
            searchQuery: location.state.searchKeyword || "",
          }));
        } else if (location.state?.searchKeyword) {
          const searchResults = await productService.searchProducts(
            location.state.searchKeyword
          );
          setProducts(searchResults);
          setFilters((prev) => ({
            ...prev,
            searchQuery: location.state.searchKeyword,
          }));
        } else {
          const res = await productService.getAllProducts();
          setProducts(res);
          if (
            !location.state ||
            (!location.state.filter && !location.state.searchKeyword)
          ) {
            setFilters(defaultFilters);
          }
        }
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [location.state]);

  useEffect(() => {
    if (location.state?.filter) {
      let categories: string[] = [];
      if (location.state.filter === "laptop") categories = ["laptop"];
      else if (location.state.filter === "pc") categories = ["pc"];
      else if (location.state.filter === "accessories")
        categories = [
          "cpu",
          "ram",
          "drive",
          "monitor",
          "cooler",
          "psu",
          "case",
          "headset",
          "network-card",
          "motherboard",
          "keyboard",
          "gpu",
          "mouse",
        ];
      setFilters((prev) => ({
        ...prev,
        categories: categories as ProductCategory[],
        searchQuery: "",
      }));
    } else if (location.state?.clearFilter) {
      setFilters(defaultFilters);
    }
  }, [location.state]);

  useEffect(() => {
    let filtered = [...products].filter((p) => p.isActive);

    if (filters.categories.length > 0) {
      filtered = filtered.filter((p) => {
        const categorySlug = p.category?.slug?.toLowerCase();
        return filters.categories.some(
          (cat) => categorySlug === cat.toLowerCase()
        );
      });
    }

    if (filters.searchQuery?.trim()) {
      const keyword = filters.searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword) ||
          (p.category?.name?.toLowerCase() || "").includes(keyword)
      );
    }

    if (filters.sortOrder === "asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (filters.sortOrder === "desc") {
      filtered.sort((a, b) => b.price - a.price);
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
  }, [products, filters]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const slug = p.category?.slug;
      if (slug) counts[slug] = (counts[slug] || 0) + 1;
    });
    return counts;
  }, [products]);

  const categoryNameBySlug = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((p) => {
      if (p.category?.slug && p.category?.name) {
        map[p.category.slug] = p.category.name;
      }
    });
    return map;
  }, [products]);

  const totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIdx = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return filteredProducts.slice(startIdx, startIdx + PRODUCTS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const handleAddToCart = async (product: Product, quantity = 1) => {
    if (!product.id) {
      setAddToCartStatus({
        message: "Dữ liệu sản phẩm không hợp lệ",
        type: "error",
      });
      return;
    }
    try {
      await addToCart(product.id, quantity);
      setAddToCartStatus({
        message: "Đã thêm vào giỏ hàng!",
        type: "success",
      });
    } catch {
      setAddToCartStatus({
        message: "Không thể thêm vào giỏ hàng",
        type: "error",
      });
    }
  };

  const removeCategory = (slug: ProductCategory) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== slug),
    }));
  };

  const clearSearch = () => {
    setFilters((prev) => ({ ...prev, searchQuery: "" }));
  };

  const hasActiveFilters =
    filters.categories.length > 0 || Boolean(filters.searchQuery?.trim());

  return (
    <>
      {addToCartStatus && (
        <div
          role="status"
          className={`fixed right-4 top-24 z-[1000] flex max-w-sm items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium text-white shadow-lg ${
            addToCartStatus.type === "success"
              ? "border-tertiary/30 bg-tertiary"
              : "border-error/30 bg-error"
          }`}
        >
          {addToCartStatus.message}
        </div>
      )}

      <div className="min-h-screen bg-bg-base pt-[88px]">
        {/* Page header band */}
        <div className="relative border-b border-slate-border/80 bg-bg-card overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_0%_0%,rgba(183,0,17,0.07),transparent_55%),radial-gradient(ellipse_50%_60%_at_100%_100%,rgba(0,104,43,0.05),transparent_50%)]" />
          <div className="relative mx-auto max-w-page px-4 py-6 md:px-6 md:py-8">
            <nav className="mb-3 flex items-center gap-1.5 text-label-xs text-secondary">
              <Link to="/" className="hover:text-primary transition-colors">
                Trang chủ
              </Link>
              <ChevronRight className="h-3 w-3 opacity-50" />
              <span className="font-medium text-on-surface">Sản phẩm</span>
            </nav>
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-headline-xl font-bold tracking-tight text-on-surface md:text-[32px] md:leading-[40px]">
                  Tất cả sản phẩm
                </h1>
                <p className="mt-1.5 text-body-sm text-secondary">
                  {loading ? (
                    "Đang tải danh mục..."
                  ) : (
                    <>
                      <span className="font-semibold text-primary tabular-nums">
                        {filteredProducts.length}
                      </span>{" "}
                      sản phẩm
                      {products.length !== filteredProducts.length && (
                        <span className="text-secondary/80">
                          {" "}
                          (lọc từ {products.length})
                        </span>
                      )}
                    </>
                  )}
                </p>
              </div>

              {/* Toolbar: search + sort */}
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:max-w-xl md:justify-end">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary" />
                  <input
                    type="search"
                    placeholder="Tìm trong danh mục..."
                    value={filters.searchQuery}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        searchQuery: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-border bg-surface-container-low/50 py-2.5 pl-10 pr-4 text-sm text-on-surface placeholder:text-secondary/70 transition-colors focus:border-primary focus:bg-bg-card focus:outline-none focus:ring-2 focus:ring-primary/15"
                  />
                </div>
                <select
                  value={filters.sortOrder}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      sortOrder: e.target.value as FilterState["sortOrder"],
                    }))
                  }
                  className="shrink-0 rounded-xl border border-slate-border bg-bg-card px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
                  aria-label="Sắp xếp"
                >
                  <option value="none">Sắp xếp: Mặc định</option>
                  <option value="asc">Giá thấp → cao</option>
                  <option value="desc">Giá cao → thấp</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-page px-4 py-6 md:px-6 md:py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            {/* Sidebar */}
            <div className="w-full shrink-0 lg:w-[280px] xl:w-[300px]">
              <div className="lg:sticky lg:top-[100px]">
                <ProductFilters
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  categoryCounts={categoryCounts}
                />
              </div>
            </div>

            {/* Main grid */}
            <div className="min-w-0 flex-1">
              {/* Active filter chips */}
              {hasActiveFilters && !loading && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-label-xs font-medium text-secondary">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    Đang lọc:
                  </span>
                  {filters.searchQuery?.trim() && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 text-[11px] font-medium text-on-surface hover:bg-primary-light hover:text-primary"
                    >
                      &quot;{filters.searchQuery.trim()}&quot;
                      <span className="text-secondary">×</span>
                    </button>
                  )}
                  {filters.categories.map((slug) => (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => removeCategory(slug)}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/15"
                    >
                      {categoryNameBySlug[slug] || slug}
                      <span>×</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFilters(defaultFilters)}
                    className="text-[11px] font-medium text-secondary underline-offset-2 hover:text-primary hover:underline"
                  >
                    Xóa tất cả
                  </button>
                </div>
              )}

              {/* Sort hint on mobile when chips hidden */}
              {!loading && filteredProducts.length > 0 && (
                <p className="mb-3 hidden text-label-xs text-secondary sm:block">
                  Hiển thị trang {currentPage}/{totalPages || 1} ·{" "}
                  {sortLabels[filters.sortOrder || "none"]}
                </p>
              )}

              {loading ? (
                <ProductGridSkeleton />
              ) : paginatedProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-border bg-bg-card px-6 py-16 text-center">
                  <PackageSearch className="mb-4 h-12 w-12 text-secondary/40" />
                  <h2 className="text-headline-lg font-semibold text-on-surface">
                    Không tìm thấy sản phẩm
                  </h2>
                  <p className="mt-2 max-w-sm text-body-sm text-secondary">
                    Thử bỏ bớt bộ lọc hoặc đổi từ khóa tìm kiếm.
                  </p>
                  <button
                    type="button"
                    onClick={() => setFilters(defaultFilters)}
                    className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-hover"
                  >
                    Xem tất cả
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {paginatedProducts.map((product, index) => (
                      <div
                        key={product.id}
                        className="animate-[fadeInUp_0.4s_ease-out_both]"
                        style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
                      >
                        <BrowseProductCard
                          product={product}
                          onAddToCart={handleAddToCart}
                          fromSource="all-products"
                          compact
                        />
                      </div>
                    ))}
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={PRODUCTS_PER_PAGE}
                    totalItems={filteredProducts.length}
                    className="mt-8"
                  />
                </>
              )}

              {loading && (
                <div className="mt-6 flex justify-center">
                  <LoadingIndicator label="Đang tải sản phẩm..." variant="inline" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
};

export default AllProductsPage;

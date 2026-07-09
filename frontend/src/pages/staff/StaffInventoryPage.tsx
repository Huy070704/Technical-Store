import { useEffect, useMemo, useState } from 'react';
import { StaffLayout } from '@/components/staff';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import MetricCard from '@/components/admin/shared/MetricCard';
import {
  inventoryService,
  type InventoryItem,
  type InventoryKpis,
} from '@/services/inventoryService';
import type { ProductMetric } from '@/components/admin/types/admin';
import { ds } from '@/styles/designSystem';
import { useAuth } from '@/contexts/AuthContext';

const mapStatus = (status: string) => {
  switch (status.toLowerCase()) {
    case 'stable':
      return 'Ổn định';
    case 'low stock':
      return 'Tồn kho thấp';
    case 'out of stock':
      return 'Hết hàng';
    default:
      return status;
  }
};

const StaffInventoryPage = () => {
  const { user } = useAuth();

  const facilityName = useMemo(() => {
    if (user?.facility && typeof user.facility === 'object') {
      return (user.facility as { id: string; name?: string }).name ?? null;
    }
    return null;
  }, [user]);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [kpis, setKpis] = useState<InventoryKpis | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, statusFilter, debouncedSearch]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await inventoryService.getStaffReport({
        categoryId: categoryFilter,
        status: statusFilter,
        search: debouncedSearch,
        page: currentPage,
        limit: itemsPerPage,
        sortBy,
        sortOrder,
      });

      setItems(data.items);
      setKpis(data.kpis);
      setCategories(data.categories);
      setTotalPages(data.pagination.totalPages || 1);
      setTotalItems(data.pagination.totalItems || 0);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu tồn kho. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, statusFilter, debouncedSearch, currentPage, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const kpiMetrics: ProductMetric[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Tổng Sản Phẩm',
        value: totalItems.toLocaleString('vi-VN'),
        icon: 'inventory_2',
        tone: 'primary',
        meta: 'Mặt hàng tồn kho',
        metaTone: 'neutral',
      },
      {
        label: 'Tồn Kho Thấp',
        value: kpis.lowStockAlerts.toString(),
        icon: 'warning',
        tone: 'secondary',
        meta: 'Cần chú ý',
        metaTone: 'danger',
      },
      {
        label: 'Sản Phẩm Hết Hàng',
        value: (kpis.outOfStockCount ?? 0).toString(),
        icon: 'highlight_off',
        tone: 'secondary',
        meta: 'Cần nhập hàng',
        metaTone: 'danger',
      },
    ];
  }, [kpis, totalItems]);

  const hasActiveFilters =
    searchQuery !== '' || categoryFilter !== 'all' || statusFilter !== 'all';

  return (
    <StaffLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <header className="flex flex-col justify-between gap-md rounded-xl border border-slate-border bg-bg-card p-lg shadow-sm lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-sm text-body-sm font-bold text-primary">
              <MaterialIcon name="inventory_2" className="text-[18px]" />
              TỒN KHO CỬA HÀNG
              {facilityName && (
                <span className="ml-xs rounded-full border border-primary/20 bg-primary/10 px-sm py-0.5 text-label-xs font-semibold text-primary">
                  <MaterialIcon name="store" className="mr-0.5 align-middle text-[13px]" />
                  {facilityName}
                </span>
              )}
            </div>
            <h1 className="mt-1 text-headline-xl font-bold text-on-surface">Tồn kho cửa hàng</h1>
            <p className="text-body-sm text-secondary">
              {facilityName
                ? `Xem số lượng tồn kho các sản phẩm tại cơ sở: ${facilityName}`
                : 'Xem số lượng tồn kho các sản phẩm tại cơ sở của bạn.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchReport()}
            disabled={loading}
            className="flex shrink-0 items-center gap-xs rounded-lg border border-slate-border/50 bg-bg-card px-lg py-2.5 text-body-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
          >
            <MaterialIcon name="refresh" className={`text-[18px] ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </header>

        {kpis && (
          <section className="grid grid-cols-1 gap-lg md:grid-cols-3">
            {kpiMetrics.map((m) => (
              <MetricCard key={m.label} metric={m} />
            ))}
          </section>
        )}

        <div className={`${ds.card.base} ${ds.card.paddingMd} w-full transition-all duration-300`}>
          <div className="flex flex-col gap-md md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-xl">
              <MaterialIcon name="search" className="absolute left-md top-1/2 -translate-y-1/2 text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm mã SKU hoặc tên sản phẩm..."
                className="w-full rounded-lg border border-slate-border/50 bg-slate-50 hover:bg-slate-100 focus:bg-white py-sm pl-xl pr-md text-body-sm text-on-surface placeholder-secondary/60 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-md text-slate-400 hover:text-slate-600"
                  type="button"
                >
                  <MaterialIcon name="close" className="text-[18px]" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-md">
              <div className="flex items-center gap-sm">
                <label className="text-body-sm font-semibold text-secondary shrink-0">Danh mục:</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="min-w-[140px] rounded-lg border border-slate-border/50 bg-slate-50 hover:bg-slate-100 focus:bg-white px-md py-sm text-body-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="all">Tất cả danh mục</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-sm">
                <label className="text-body-sm font-semibold text-secondary shrink-0">Trạng thái:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="min-w-[140px] rounded-lg border border-slate-border/50 bg-slate-50 hover:bg-slate-100 focus:bg-white px-md py-sm text-body-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="stable">Ổn định</option>
                  <option value="low_stock">Tồn kho thấp</option>
                  <option value="out_of_stock">Hết hàng</option>
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setCategoryFilter('all');
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="flex items-center justify-center gap-xs rounded-lg border border-slate-border/50 bg-slate-50 px-md py-sm text-body-sm font-medium text-secondary transition-all hover:bg-slate-200 active:scale-[0.98]"
                  type="button"
                >
                  <MaterialIcon name="restart_alt" className="text-sm" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col space-y-md">
          {error ? (
            <div className="rounded-lg bg-error-container p-4 text-error text-center">
              <p className="mb-2">{error}</p>
              <button onClick={() => void fetchReport()} className="text-sm font-semibold hover:underline" type="button">
                Thử lại
              </button>
            </div>
          ) : loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="text-secondary">Đang tải dữ liệu tồn kho...</div>
            </div>
          ) : items.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center border border-slate-border/30 bg-bg-card rounded-2xl shadow-sm">
              <span className="text-secondary/50 mb-4">
                <MaterialIcon name="inventory_2" className="text-[48px]" />
              </span>
              <h3 className="text-headline-sm font-bold text-on-surface">Không tìm thấy sản phẩm</h3>
              <p className="mt-2 text-body-sm text-secondary max-w-sm">
                Thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm của bạn.
              </p>
            </div>
          ) : (
            <div className={ds.table.wrap}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className={`${ds.table.header} bg-slate-50/50`}>
                    <tr className="border-b border-slate-border/40">
                      <th className="py-4 pl-6 pr-4 text-label-md cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('sku')}>
                        <span className="flex items-center gap-1">Mã SKU {sortBy === 'sku' && <MaterialIcon name={sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} className="text-[14px]" />}</span>
                      </th>
                      <th className="py-4 px-4 text-label-md cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('name')}>
                        <span className="flex items-center gap-1">Sản Phẩm {sortBy === 'name' && <MaterialIcon name={sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} className="text-[14px]" />}</span>
                      </th>
                      <th className="py-4 px-4 text-label-md text-right">
                        Giá
                      </th>
                      <th className="py-4 px-4 text-label-md text-right cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('totalStock')}>
                        <span className="flex items-center justify-end gap-1">Tồn Kho {sortBy === 'totalStock' && <MaterialIcon name={sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} className="text-[14px]" />}</span>
                      </th>
                      <th className="py-4 pr-6 pl-4 text-label-md cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('status')}>
                        <span className="flex items-center gap-1">Trạng Thái {sortBy === 'status' && <MaterialIcon name={sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} className="text-[14px]" />}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-border/30">
                    {items.map((item) => (
                      <tr key={item.id} className={`${ds.table.row} hover:bg-slate-50/50 transition-colors`}>
                        <td className="py-4 pl-6 pr-4 align-middle text-body-sm">
                          <span className="text-body-sm font-mono text-secondary">{item.sku}</span>
                        </td>
                        <td className="py-4 px-4 align-middle max-w-[280px] text-body-sm">
                          <div className="flex items-center gap-3">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-11 w-11 shrink-0 rounded-lg object-cover border border-slate-border/40"
                              />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest border border-slate-border/30">
                                <MaterialIcon name="image" className="text-secondary text-[20px]" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-body-sm font-semibold text-on-surface truncate" title={item.name}>{item.name}</div>
                              <div className="text-body-xs text-secondary mt-0.5 truncate">{item.categoryName}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 align-middle text-right text-body-sm whitespace-nowrap">
                          <span className="font-semibold text-primary">
                            {item.unitPrice.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
                          </span>
                        </td>
                        <td className="py-4 px-4 align-middle text-right text-body-sm">
                          <span className="text-body-sm text-on-surface font-semibold">{item.totalStock.toLocaleString()}</span>
                        </td>
                        <td className="py-4 pr-6 pl-4 align-middle text-body-sm">
                          <span
                            className={
                              item.status === 'Stable'
                                ? ds.badge.success
                                : item.status === 'Low Stock'
                                  ? ds.badge.warning
                                  : ds.badge.error
                            }
                          >
                            {mapStatus(item.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!loading && totalPages > 1 && (
                <div className="flex flex-col gap-md border-t border-slate-border/50 bg-surface-container-low px-lg py-md sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-body-sm text-secondary">
                    Hiển thị {items.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} đến{' '}
                    {Math.min(currentPage * itemsPerPage, totalItems)} trong tổng số {totalItems} mục
                  </span>
                  <div className="flex items-center gap-xs">
                    <button
                      aria-label="Trang trước"
                      className="rounded-lg p-sm text-secondary transition-colors hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      type="button"
                    >
                      <MaterialIcon name="chevron_left" />
                    </button>
                    <button
                      aria-label="Trang sau"
                      className="rounded-lg p-sm text-secondary transition-colors hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      type="button"
                    >
                      <MaterialIcon name="chevron_right" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </StaffLayout>
  );
};

export default StaffInventoryPage;

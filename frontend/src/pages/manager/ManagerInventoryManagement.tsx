import { useEffect, useMemo, useState } from 'react';
import { AdminLayout, PageHeader, MetricCard } from '../../components/admin';
import MaterialIcon from '../../components/admin/shared/MaterialIcon';
import AdjustStockModal from '../../components/admin/inventory/AdjustStockModal';
import {
  inventoryService,
  type InventoryItem,
  type InventoryKpis,
} from '@/services/inventoryService';
import type { ProductMetric } from '../../components/admin/types/admin';
import { ds } from '@/styles/designSystem';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const ManagerInventoryManagement = () => {
  const { user } = useAuth();
  const toast = useToast();

  const managerFacilityId = useMemo(() => {
    if (!user?.facility) return null;
    return typeof user.facility === 'string' ? user.facility : user.facility.id;
  }, [user?.facility]);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [kpis, setKpis] = useState<InventoryKpis | null>(null);
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([]);
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
  const [exporting, setExporting] = useState(false);
  const [isUnusualModalOpen, setIsUnusualModalOpen] = useState(false);

  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null);
  const [adjustSaving, setAdjustSaving] = useState(false);

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
      const data = await inventoryService.getManagerReport({
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
      setFacilities(data.facilities);
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
  }, [categoryFilter, statusFilter, debouncedSearch, currentPage, sortBy, sortOrder]);

  const handleExport = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      await inventoryService.exportManagerReport({
        categoryId: categoryFilter,
        status: statusFilter,
        search: debouncedSearch,
        sortBy,
        sortOrder,
      });
    } catch (err) {
      console.error(err);
      toast.error('Không thể xuất báo cáo.');
    } finally {
      setExporting(false);
    }
  };

  const handleAdjustSubmit = async (payload: {
    productId: string;
    facilityId: string;
    mode: 'set' | 'add' | 'subtract';
    quantity: number;
    reason?: string;
  }) => {
    try {
      setAdjustSaving(true);
      const result = await inventoryService.adjustStock(payload);
      toast.success(
        `Đã cập nhật tồn kho ${result.productName}: ${result.previousQuantity} → ${result.newQuantity}`,
      );
      setAdjustTarget(null);
      await fetchReport();
    } catch (err) {
      const apiError = err as ApiError;
      toast.error(apiError?.response?.data?.message ?? 'Điều chỉnh tồn kho thất bại.');
    } finally {
      setAdjustSaving(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(val);

  const kpiMetrics: ProductMetric[] = useMemo(() => {
    if (!kpis) return [];
    return [
      {
        label: 'Tổng Giá Trị',
        value: formatCurrency(kpis.totalInventoryValue),
        icon: 'monetization_on',
        tone: 'primary',
        meta: managerFacilityId ? 'Cơ sở được phân công' : 'Tất cả cơ sở',
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
        tone: 'danger',
        meta: 'Cần nhập hàng gấp',
        metaTone: 'danger',
      },
      {
        label: 'Cảnh Báo',
        value: kpis.unusualActivities.count.toString(),
        icon: 'history',
        tone: 'neutral',
        meta: 'Cập nhật gần đây',
        metaTone: 'neutral',
      },
    ];
  }, [kpis, managerFacilityId]);

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

  const hasActiveFilters =
    searchQuery !== '' || categoryFilter !== 'all' || statusFilter !== 'all';

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          title="Quản Lý Tồn Kho"
          description="Theo dõi tồn kho và điều chỉnh số lượng khi nhập hàng, kiểm kê hoặc sửa sai lệch dữ liệu."
          actionLabel={exporting ? 'Đang xuất...' : 'Xuất CSV'}
          actionIcon={exporting ? 'sync' : 'file_download'}
          onActionClick={handleExport}
        />

        {kpis && (
          <section className="grid grid-cols-1 gap-lg md:grid-cols-2 lg:grid-cols-4">
            <MetricCard metric={kpiMetrics[0]} />
            <button
              onClick={() => setStatusFilter('low_stock')}
              className="text-left w-full block focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-xl animate-fade-in"
              type="button"
            >
              <MetricCard metric={kpiMetrics[1]} />
            </button>
            <MetricCard metric={kpiMetrics[2]} />
            <button
              onClick={() => setIsUnusualModalOpen(true)}
              className="text-left w-full block focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-xl animate-fade-in"
              type="button"
            >
              <MetricCard metric={kpiMetrics[3]} />
            </button>
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
                      <th className="py-4 px-4 text-label-md text-right cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('totalStock')}>
                        <span className="flex items-center justify-end gap-1">Tồn Kho {sortBy === 'totalStock' && <MaterialIcon name={sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} className="text-[14px]" />}</span>
                      </th>
                      <th className="py-4 px-4 text-label-md text-right cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('totalValue')}>
                        <span className="flex items-center justify-end gap-1">Giá Trị {sortBy === 'totalValue' && <MaterialIcon name={sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} className="text-[14px]" />}</span>
                      </th>
                      <th className="py-4 px-4 text-label-md cursor-pointer hover:text-primary transition-colors" onClick={() => handleSort('status')}>
                        <span className="flex items-center gap-1">Trạng Thái {sortBy === 'status' && <MaterialIcon name={sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'} className="text-[14px]" />}</span>
                      </th>
                      <th className="py-4 pr-6 pl-4 text-label-md text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-border/30">
                    {items.map((item) => (
                      <tr key={item.id} className={`${ds.table.row} hover:bg-slate-50/50 transition-colors`}>
                        <td className="py-4 pl-6 pr-4 align-top text-body-sm">
                          <span className="text-body-sm font-mono text-secondary">{item.sku}</span>
                        </td>
                        <td className="py-4 px-4 align-top max-w-[240px] text-body-sm">
                          <div className="text-body-sm font-semibold text-on-surface truncate" title={item.name}>
                            {item.name}
                          </div>
                          <div className="text-body-xs text-secondary mt-1 truncate">{item.categoryName}</div>
                        </td>
                        <td className="py-4 px-4 align-top text-right text-body-sm">
                          <span className="text-body-sm text-on-surface font-semibold">{item.totalStock.toLocaleString()}</span>
                        </td>
                        <td className="py-4 px-4 align-top text-right text-body-sm">
                          <span className="text-body-sm text-on-surface">{formatCurrency(item.totalValue)}</span>
                        </td>
                        <td className="py-4 px-4 align-top text-body-sm">
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
                        <td className="py-4 pr-6 pl-4 align-top text-center text-body-sm">
                          <button
                            type="button"
                            onClick={() => setAdjustTarget(item)}
                            className="inline-flex items-center gap-xs rounded-lg border border-primary/30 bg-primary/5 px-sm py-xs text-label-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                            aria-label={`Điều chỉnh tồn kho ${item.name}`}
                          >
                            <MaterialIcon name="edit_square" className="text-[16px]" />
                            Điều chỉnh
                          </button>
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

      {adjustTarget && (
        <AdjustStockModal
          item={adjustTarget}
          facilities={facilities}
          managerFacilityId={managerFacilityId}
          saving={adjustSaving}
          onClose={() => setAdjustTarget(null)}
          onSubmit={handleAdjustSubmit}
        />
      )}

      {isUnusualModalOpen && kpis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md animate-fade-in">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-bg-card shadow-xl flex flex-col max-h-[90vh] border border-slate-border/50 scale-up transition-all">
            <div className="flex items-center justify-between border-b border-slate-border/50 px-lg py-md shrink-0">
              <div>
                <h2 className="text-headline-sm font-bold text-on-surface">Cảnh Báo Tồn Kho</h2>
                <p className="text-body-sm text-secondary">Các sản phẩm cần chú ý gần đây.</p>
              </div>
              <button
                aria-label="Đóng"
                onClick={() => setIsUnusualModalOpen(false)}
                className="rounded p-xs text-secondary transition-colors hover:bg-bg-soft hover:text-on-surface"
                type="button"
              >
                <MaterialIcon name="close" />
              </button>
            </div>

            <div className="p-lg overflow-y-auto space-y-md flex-grow">
              {kpis.unusualActivities.list.length === 0 ? (
                <p className="text-body-sm text-secondary text-center py-4">Không có cảnh báo nào gần đây.</p>
              ) : (
                kpis.unusualActivities.list.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-start gap-3 rounded-sm border border-error/30 bg-error-container/20 p-md text-body-sm text-on-surface"
                  >
                    <MaterialIcon name="error_outline" className="text-error shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-on-surface">{act.message}</p>
                      <p className="text-label-xs text-secondary mt-1">{act.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-slate-border/50 px-lg py-md shrink-0 flex justify-end">
              <button
                onClick={() => setIsUnusualModalOpen(false)}
                className="rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary shadow-md transition-colors hover:bg-primary-hover"
                type="button"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default ManagerInventoryManagement;

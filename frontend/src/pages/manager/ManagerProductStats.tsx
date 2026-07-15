import { useEffect, useState, useMemo, useCallback } from 'react';
import { AdminLayout } from '../../components/admin';
import MaterialIcon from '../../components/admin/shared/MaterialIcon';
import {
  statisticsService,
  type DashboardStatistics,
  type ManagerDetailedStats,
} from '@/services/statisticsService';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

const ManagerProductStats = () => {
  const toast = useToast();
  const { user } = useAuth();

  const facilityName = useMemo(() => {
    if (!user?.facility) return null;
    if (typeof user.facility === 'object' && user.facility !== null) {
      return (user.facility as { id: string; name?: string }).name ?? null;
    }
    return null;
  }, [user]);

  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [managerStats, setManagerStats] = useState<ManagerDetailedStats | null>(null);
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'custom'>('30days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  const fetchData = useCallback(async () => {
    if (timeRange === 'custom' && (!customStartDate || !customEndDate)) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const queryParams: { timeRange?: string; startDate?: string; endDate?: string } = {
        timeRange,
      };
      if (timeRange === 'custom') {
        queryParams.startDate = customStartDate;
        queryParams.endDate = customEndDate;
      }
      const [statsData, managerData] = await Promise.all([
        statisticsService.getDashboardData(queryParams),
        statisticsService.getManagerDetailedStats(queryParams),
      ]);
      setStats(statsData);
      setManagerStats(managerData);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu sản phẩm. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [timeRange, customStartDate, customEndDate]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleExport = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const queryParams: { timeRange?: string; startDate?: string; endDate?: string } = {
        timeRange,
      };
      if (timeRange === 'custom') {
        queryParams.startDate = customStartDate;
        queryParams.endDate = customEndDate;
      }
      await statisticsService.exportManagerStats('products', queryParams);
      toast.success('Xuất báo cáo sản phẩm thành công!');
    } catch {
      toast.error('Không thể xuất báo cáo sản phẩm.');
    } finally {
      setExporting(false);
    }
  };

  const formatVND = (value: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);

  const filteredTopProducts = useMemo(() => {
    if (!stats?.topProducts) return [];
    if (!productSearch) return stats.topProducts;
    return stats.topProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [stats, productSearch]);

  const slowProducts = useMemo(() => {
    if (!managerStats?.slowMovingProducts) return [];
    return managerStats.slowMovingProducts.map((p) => ({
      name: p.name,
      category: p.categoryName,
      stock: p.currentStock,
      sales30d: p.sales30d,
      revenue: p.revenue30d,
    }));
  }, [managerStats]);

  const isWaitingForCustomDates = timeRange === 'custom' && (!customStartDate || !customEndDate);

  return (
    <AdminLayout>
      <div className="space-y-lg mx-auto max-w-7xl pb-10">
        {/* Page Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-md bg-bg-card p-lg rounded-xl shadow-sm border border-slate-border">
          <div>
            <div className="flex items-center gap-sm text-primary font-bold text-body-sm">
              <MaterialIcon name="inventory_2" className="text-[18px]" />
              THỐNG KÊ SẢN PHẨM
              {facilityName && (
                <span className="ml-xs px-sm py-0.5 rounded-full bg-primary/10 text-primary text-label-xs font-semibold border border-primary/20">
                  <MaterialIcon name="store" className="text-[13px] align-middle mr-0.5" />
                  {facilityName}
                </span>
              )}
            </div>
            <h1 className="text-headline-xl text-on-surface font-bold mt-1">Thống kê Sản phẩm</h1>
            <p className="text-body-sm text-secondary">
              {facilityName
                ? `Phân tích sản phẩm tại cơ sở: ${facilityName}`
                : 'Phân tích danh mục hàng bán chạy, hàng bán chậm để cân đối tồn kho hợp lý.'}
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-primary text-on-primary text-label-md px-lg py-2.5 rounded-lg font-semibold hover:bg-primary-hover hover:shadow-md active:scale-[0.98] flex items-center gap-xs transition-all duration-200 disabled:opacity-60"
          >
            <MaterialIcon name={exporting ? 'sync' : 'file_download'} className={exporting ? 'animate-spin' : ''} />
            {exporting ? 'Đang xuất...' : 'Xuất Báo Cáo Sản Phẩm'}
          </button>
        </header>

        {/* Time Range Filter Bar */}
        <div className="bg-bg-card p-md rounded-xl border border-slate-border shadow-sm space-y-md">
          <div className="flex items-center gap-xs bg-bg-soft p-1 rounded-lg border border-slate-border/40 w-fit">
            {[
              { id: 'today', label: 'Hôm nay' },
              { id: '7days', label: '7 ngày qua' },
              { id: '30days', label: '30 ngày qua' },
              { id: 'custom', label: 'Tùy chọn' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setTimeRange(opt.id as any);
                  if (opt.id !== 'custom') {
                    setCustomStartDate('');
                    setCustomEndDate('');
                  }
                }}
                className={`px-lg py-1.5 rounded-lg text-label-sm font-bold transition-all duration-200 ${
                  timeRange === opt.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-secondary hover:text-on-surface'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {timeRange === 'custom' && (
            <div className="flex flex-wrap items-center gap-md border-t border-slate-border/30 pt-md animate-fade-in">
              <MaterialIcon name="date_range" className="text-secondary" />
              <label className="shrink-0 text-body-sm font-semibold text-secondary">Từ ngày:</label>
              <input
                type="date"
                value={customStartDate}
                max={customEndDate || undefined}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="cursor-pointer rounded-lg border border-slate-border/50 bg-slate-50 px-md py-sm text-body-sm text-on-surface outline-none transition-all hover:bg-slate-100 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
              <label className="shrink-0 text-body-sm font-semibold text-secondary">Đến ngày:</label>
              <input
                type="date"
                value={customEndDate}
                min={customStartDate || undefined}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="cursor-pointer rounded-lg border border-slate-border/50 bg-slate-50 px-md py-sm text-body-sm text-on-surface outline-none transition-all hover:bg-slate-100 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
              {customStartDate && customEndDate && (
                <button
                  onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                  className="flex items-center gap-xs text-body-sm text-secondary transition-colors hover:text-error"
                >
                  <MaterialIcon name="close" className="text-[16px]" />
                  <span>Xóa</span>
                </button>
              )}
              {(!customStartDate || !customEndDate) && (
                <span className="text-label-xs text-secondary italic">Chọn cả hai mốc ngày để xem thống kê</span>
              )}
            </div>
          )}
        </div>

        {/* ── Dynamic Content Section ── */}
        {isWaitingForCustomDates ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-slate-border bg-bg-card shadow-sm animate-fade-in">
            <div className="flex flex-col items-center gap-sm text-secondary">
              <MaterialIcon name="date_range" className="text-[48px]" />
              <p className="font-semibold">Vui lòng chọn đủ hai mốc ngày để xem thống kê</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex h-96 items-center justify-center rounded-xl border border-slate-border/50 bg-bg-card shadow-sm animate-pulse">
            <div className="flex flex-col items-center gap-sm">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span>
              <div className="text-secondary font-semibold">Đang tải dữ liệu sản phẩm...</div>
            </div>
          </div>
        ) : error || !stats ? (
          <div className="rounded-xl border border-error/20 bg-error-container/20 p-xl text-center animate-fade-in">
            <span className="material-symbols-outlined text-[48px] text-error">warning</span>
            <p className="mt-md text-error font-medium">{error || 'Không tìm thấy dữ liệu.'}</p>
            <button onClick={() => void fetchData()} className="mt-lg bg-primary text-white text-label-md px-lg py-sm rounded hover:bg-primary-hover font-bold transition-all">
              Thử lại
            </button>
          </div>
        ) : (
          <div className="space-y-lg animate-fade-in">
            {/* Stock Alert Summary */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-md">
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
                <p className="text-label-xs font-bold text-secondary uppercase tracking-wider">Tổng Sản Phẩm</p>
                <h2 className="text-headline-lg font-bold text-on-surface mt-1">{stats.totalProducts?.toLocaleString('vi-VN') ?? 0}</h2>
              </div>
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
                <p className="text-label-xs font-bold text-warning uppercase tracking-wider">Sắp Hết Hàng</p>
                <h2 className="text-headline-lg font-bold text-warning mt-1">{stats.lowStockItems}</h2>
                <p className="text-label-xs text-secondary mt-xs">Tồn kho dưới ngưỡng 10</p>
              </div>
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
                <p className="text-label-xs font-bold text-error uppercase tracking-wider">Đã Hết Hàng</p>
                <h2 className="text-headline-lg font-bold text-error mt-1">{stats.outOfStockItems}</h2>
                <p className="text-label-xs text-secondary mt-xs">Cần nhập hàng gấp</p>
              </div>
            </section>

            {/* Search bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-md border-b border-slate-border/30 pb-md">
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">Phân tích chi tiết sản phẩm</h3>
                <p className="text-body-sm text-secondary">Hàng bán chạy và hàng bán chậm cần lưu ý.</p>
              </div>
              <div className="relative max-w-xs w-full">
                <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Tìm kiếm sản phẩm thống kê..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-border bg-bg-card rounded-lg text-body-sm outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Best Sellers & Slow Moving */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
              {/* Best Selling Products */}
              <div className="lg:col-span-2 bg-bg-card rounded-xl border border-slate-border shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="p-lg border-b border-slate-border/40">
                  <h3 className="text-body-md font-bold text-primary flex items-center gap-xs">
                    <MaterialIcon name="trending_up" /> Sản Phẩm Bán Chạy (Top 5)
                  </h3>
                  <p className="text-body-xs text-secondary">Thống kê sản lượng và doanh số cao nhất hệ thống cửa hàng.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-label-xs font-bold text-secondary uppercase border-b border-slate-border/40">
                      <tr>
                        <th className="px-lg py-3">Hạng</th>
                        <th className="px-lg py-3">Tên Sản Phẩm</th>
                        <th className="px-lg py-3 text-right">Đã Bán</th>
                        <th className="px-lg py-3 text-right">Doanh Số</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border/20 text-body-sm">
                      {filteredTopProducts.length === 0 ? (
                        <tr><td colSpan={4} className="px-lg py-8 text-center text-secondary">Không tìm thấy sản phẩm phù hợp.</td></tr>
                      ) : filteredTopProducts.map((p) => (
                        <tr key={p.name} className="hover:bg-slate-50/30">
                          <td className="px-lg py-4 text-center font-bold text-secondary w-16">
                            {p.rank <= 3 ? (
                              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-label-xs font-bold ${
                                p.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                p.rank === 2 ? 'bg-slate-100 text-slate-600' :
                                'bg-orange-100 text-orange-700'
                              }`}>{p.rank}</span>
                            ) : p.rank}
                          </td>
                          <td className="px-lg py-4 font-semibold text-on-surface">{p.name}</td>
                          <td className="px-lg py-4 text-right font-semibold">{p.quantity.toLocaleString()} chiếc</td>
                          <td className="px-lg py-4 text-right font-mono text-primary font-bold">{formatVND(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-lg bg-bg-soft/40 border-t border-slate-border/40 text-body-xs text-secondary">
                  * Sản phẩm bán chạy được tự động tổng hợp từ dữ liệu hóa đơn giao dịch thành công.
                </div>
              </div>

              {/* Slow Moving Products */}
              <div className="bg-bg-card rounded-xl border border-slate-border shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="p-lg border-b border-slate-border/40">
                  <h3 className="text-body-md font-bold text-warning flex items-center gap-xs">
                    <MaterialIcon name="inventory" /> Hàng Bán Chậm cần lưu ý
                  </h3>
                  <p className="text-body-xs text-secondary">Sản phẩm có tồn kho cao nhưng sản lượng bán ra 30 ngày qua thấp.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-label-xs font-bold text-secondary uppercase border-b border-slate-border/40">
                      <tr>
                        <th className="px-md py-3">Sản Phẩm</th>
                        <th className="px-md py-3 text-right">Tồn Kho</th>
                        <th className="px-md py-3 text-right">Bán (30 ngày)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border/20 text-body-sm">
                      {slowProducts.length === 0 ? (
                        <tr><td colSpan={3} className="px-md py-8 text-center text-secondary">Không có hàng bán chậm.</td></tr>
                      ) : slowProducts.map((p) => (
                        <tr key={p.name} className="hover:bg-slate-50/30">
                          <td className="px-md py-3 font-semibold text-on-surface truncate max-w-[150px]" title={p.name}>{p.name}</td>
                          <td className="px-md py-3 text-right text-warning font-bold">{p.stock}</td>
                          <td className="px-md py-3 text-right text-secondary">{p.sales30d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-lg bg-bg-soft/40 border-t border-slate-border/40 text-body-xs text-error font-semibold flex items-center gap-xs">
                  <MaterialIcon name="info" className="text-sm" /> Cần có chương trình khuyến mãi hoặc xả kho.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManagerProductStats;

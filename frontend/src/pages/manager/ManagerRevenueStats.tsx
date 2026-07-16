import { useEffect, useState, useMemo, useCallback } from 'react';
import { AdminLayout } from '../../components/admin';
import MaterialIcon from '../../components/admin/shared/MaterialIcon';
import {
  statisticsService,
  type DashboardStatistics,
  type ManagerDetailedStats,
} from '@/services/statisticsService';
import { productService } from '@/services/productService';
import type { Category } from '@/types/product';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

const ManagerRevenueStats = () => {
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'custom'>('30days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const formatVND = (value: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);

  // Load categories once on mount
  useEffect(() => {
    productService.getCategories()
      .then((data) => setCategories(data))
      .catch(() => setCategories([]));
  }, []);

  const fetchData = useCallback(async () => {
    if (timeRange === 'custom' && (!customStartDate || !customEndDate)) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      const queryParams: { timeRange?: string; startDate?: string; endDate?: string; categoryId?: string } = {
        timeRange,
      };
      if (timeRange === 'custom') {
        queryParams.startDate = customStartDate;
        queryParams.endDate = customEndDate;
      }
      if (selectedCategory !== 'all') {
        queryParams.categoryId = selectedCategory;
      }
      const [statsData, managerData] = await Promise.all([
        statisticsService.getDashboardData(queryParams),
        statisticsService.getManagerDetailedStats(queryParams),
      ]);
      setStats(statsData);
      setManagerStats(managerData);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu doanh thu. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [timeRange, customStartDate, customEndDate, selectedCategory]);

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
      await statisticsService.exportManagerStats('revenue', queryParams);
      toast.success('Xuất báo cáo doanh thu thành công!');
    } catch {
      toast.error('Không thể xuất báo cáo doanh thu.');
    } finally {
      setExporting(false);
    }
  };

  const categoryRevenue = useMemo(() => {
    if (!managerStats?.revenueByCategory) return [];
    return managerStats.revenueByCategory.map((c) => ({
      name: c.name,
      revenue: c.revenue,
      quantitySold: c.quantitySold,
      share: c.share,
    }));
  }, [managerStats]);

  // Completed orders count from managerStats
  const completedCount = useMemo(() => {
    if (!managerStats) return 0;
    return (managerStats.orderStatusBreakdown.delivered ?? 0) + (managerStats.orderStatusBreakdown.successful ?? 0);
  }, [managerStats]);

  const selectedCategoryName = useMemo(() => {
    if (selectedCategory === 'all') return 'Tất cả danh mục';
    return categories.find((c) => c.id === selectedCategory)?.name ?? 'Danh mục đã chọn';
  }, [selectedCategory, categories]);

  const isWaitingForCustomDates = timeRange === 'custom' && (!customStartDate || !customEndDate);

  return (
    <AdminLayout>
      <div className="space-y-lg mx-auto max-w-7xl pb-10">
        {/* Page Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-md bg-bg-card p-lg rounded-xl shadow-sm border border-slate-border">
          <div>
            <div className="flex items-center gap-sm text-primary font-bold text-body-sm">
              <MaterialIcon name="payments" className="text-[18px]" />
              THỐNG KÊ DOANH THU
              {facilityName && (
                <span className="ml-xs px-sm py-0.5 rounded-full bg-primary/10 text-primary text-label-xs font-semibold border border-primary/20">
                  <MaterialIcon name="store" className="text-[13px] align-middle mr-0.5" />
                  {facilityName}
                </span>
              )}
            </div>
            <h1 className="text-headline-xl text-on-surface font-bold mt-1">Thống kê Doanh thu</h1>
            <p className="text-body-sm text-secondary">
              {facilityName
                ? `Phân tích doanh thu tại cơ sở: ${facilityName}`
                : 'Phân tích dòng tiền theo thời gian và theo danh mục sản phẩm.'}
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-primary text-on-primary text-label-md px-lg py-2.5 rounded-lg font-semibold hover:bg-primary-hover hover:shadow-md active:scale-[0.98] flex items-center gap-xs transition-all duration-200 disabled:opacity-60 animate-fade-in"
          >
            <MaterialIcon name={exporting ? 'sync' : 'file_download'} className={exporting ? 'animate-spin' : ''} />
            {exporting ? 'Đang xuất...' : 'Xuất Báo Cáo Doanh Thu'}
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
              <div className="text-secondary font-semibold">Đang tải dữ liệu doanh thu...</div>
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

            {/* KPI Summary Row */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-md">
              {/* Gross Revenue */}
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-label-xs font-bold text-secondary uppercase tracking-wider">Doanh Thu Từ Đơn Hoàn Thành</p>
                    <h2 className="text-headline-lg font-bold text-on-surface mt-1 truncate">{formatVND(stats.grossRevenue)}</h2>
                    <p className="text-label-xs text-secondary mt-2 leading-relaxed">
                      Tổng doanh số từ các đơn hàng đã hoàn thành
                      {selectedCategory !== 'all' && <span className="text-primary font-semibold"> · {selectedCategoryName}</span>}
                    </p>
                  </div>
                  <div className="p-sm rounded-lg bg-primary/10 text-primary ml-md shrink-0">
                    <MaterialIcon name="payments" />
                  </div>
                </div>
                <div className="mt-md pt-md border-t border-slate-border/30 flex items-center gap-xs text-label-xs text-tertiary">
                  <MaterialIcon name="check_circle" className="text-[14px]" />
                  <span>{completedCount} đơn hàng đã giao / thành công</span>
                </div>
              </div>

              {/* Net Profit */}
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-label-xs font-bold text-secondary uppercase tracking-wider">Lợi Nhuận Ước Tính (35%)</p>
                    <h2 className="text-headline-lg font-bold text-tertiary mt-1 truncate">{formatVND(stats.netProfit)}</h2>
                    <p className="text-label-xs text-secondary mt-2 leading-relaxed">
                      Ước tính bằng 35% trên tổng doanh thu đơn hoàn thành
                    </p>
                  </div>
                  <div className="p-sm rounded-lg bg-tertiary/10 text-tertiary ml-md shrink-0">
                    <MaterialIcon name="monetization_on" />
                  </div>
                </div>
                <div className="mt-md pt-md border-t border-slate-border/30 flex items-center gap-xs text-label-xs text-secondary">
                  <MaterialIcon name="percent" className="text-[14px]" />
                  <span>Biên lợi nhuận ước tính: 35%</span>
                </div>
              </div>

              {/* Avg Order Value */}
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-label-xs font-bold text-secondary uppercase tracking-wider">Giá Trị Đơn Hàng TB</p>
                    <h2 className="text-headline-lg font-bold text-on-surface mt-1 truncate">{formatVND(stats.avgOrderValue)}</h2>
                    <p className="text-label-xs text-secondary mt-2 leading-relaxed">
                      Doanh thu tổng chia cho số đơn hàng hoàn thành
                    </p>
                  </div>
                  <div className="p-sm rounded-lg bg-warning/10 text-warning ml-md shrink-0">
                    <MaterialIcon name="receipt" />
                  </div>
                </div>
                <div className="mt-md pt-md border-t border-slate-border/30 flex items-center gap-xs text-label-xs text-secondary">
                  <MaterialIcon name="functions" className="text-[14px]" />
                  <span>Doanh thu / {completedCount} đơn hoàn thành</span>
                </div>
              </div>
            </section>

            {/* Category Filter + Detail Section */}
            <div>
              {/* Filter bar above category table */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-sm mb-md">
                <div>
                  <h3 className="text-headline-sm font-bold text-on-surface">Phân tích doanh thu chi tiết</h3>
                  <p className="text-body-sm text-secondary">Phân tích dòng tiền theo thời gian và theo danh mục sản phẩm từ các đơn đã hoàn thành.</p>
                </div>
                {/* Category filter dropdown */}
                {categories.length > 0 && (
                  <div className="flex items-center gap-xs">
                    <MaterialIcon name="category" className="text-secondary text-[18px]" />
                    <select
                      value={selectedCategory}
                      className="rounded-lg border border-slate-border bg-bg-card px-md py-2 text-body-sm font-semibold text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer min-w-[160px]"
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                      }}
                    >
                      <option value="all">Tất cả danh mục</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Category Revenue Table - Full Width */}
              <div className="bg-bg-card rounded-xl border border-slate-border shadow-sm overflow-hidden">
                <div className="p-lg border-b border-slate-border/40 flex items-start justify-between">
                  <div>
                    <h3 className="text-body-md font-bold">Doanh Thu Theo Danh Mục Sản Phẩm</h3>
                    <p className="text-body-xs text-secondary mt-0.5">
                      Tổng doanh số của từng danh mục từ các đơn hàng đã hoàn thành (Đã giao / Thành công)
                      {selectedCategory !== 'all' && (
                        <span className="ml-xs inline-flex items-center gap-0.5 px-sm py-0.5 rounded-full bg-primary/10 text-primary text-label-xs font-semibold">
                          <MaterialIcon name="filter_list" className="text-[11px]" />
                          Đang lọc: {selectedCategoryName}
                        </span>
                      )}
                    </p>
                  </div>
                  {selectedCategory !== 'all' && (
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="flex items-center gap-xs text-label-xs text-secondary hover:text-error transition-colors shrink-0 ml-md"
                    >
                      <MaterialIcon name="close" className="text-[14px]" />
                      Xóa lọc
                    </button>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-label-xs font-bold text-secondary uppercase border-b border-slate-border/40">
                      <tr>
                        <th className="px-lg py-3">Danh Mục Sản Phẩm</th>
                        <th className="px-lg py-3 text-right">Doanh Thu</th>
                        <th className="px-lg py-3 text-right">Đã Bán</th>
                        <th className="px-lg py-3 text-right w-48">Tỷ Trọng Doanh Thu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border/20 text-body-sm">
                      {categoryRevenue.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-lg py-12 text-center">
                            <div className="flex flex-col items-center gap-sm text-secondary">
                              <MaterialIcon name="category" className="text-[36px]" />
                              <p className="font-semibold">Chưa có dữ liệu doanh thu theo danh mục.</p>
                              <p className="text-label-xs">Hoàn thành một số đơn hàng để xem thống kê.</p>
                            </div>
                          </td>
                        </tr>
                      ) : categoryRevenue.map((cat, idx) => (
                        <tr key={cat.name} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-lg py-4">
                            <div className="flex items-center gap-sm">
                              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-label-xs font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-semibold text-on-surface">{cat.name}</span>
                            </div>
                          </td>
                          <td className="px-lg py-4 text-right font-mono text-primary font-bold">{formatVND(cat.revenue)}</td>
                          <td className="px-lg py-4 text-right text-secondary">
                            {cat.quantitySold.toLocaleString('vi-VN')} sản phẩm
                          </td>
                          <td className="px-lg py-4 text-right">
                            <div className="flex items-center justify-end gap-md">
                              <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${cat.share}%`,
                                    background: `hsl(${220 - idx * 30}, 80%, 55%)`,
                                  }}
                                />
                              </div>
                              <span className="font-bold text-on-surface min-w-[3rem] text-right">{cat.share}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-lg bg-bg-soft/50 border-t border-slate-border/40">
                  <div className="flex justify-between items-center text-body-xs font-bold">
                    <div className="flex items-center gap-xs text-secondary">
                      <MaterialIcon name="summarize" className="text-[15px]" />
                      <span>TỔNG DOANH THU {selectedCategory !== 'all' ? selectedCategoryName.toUpperCase() : 'TẤT CẢ DANH MỤC'}</span>
                    </div>
                    <span className="text-primary font-mono text-body-md">{formatVND(categoryRevenue.reduce((s, c) => s + c.revenue, 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManagerRevenueStats;

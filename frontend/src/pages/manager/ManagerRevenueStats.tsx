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
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'custom'>('30days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [revenueFilter, setRevenueFilter] = useState<'day' | 'month' | 'year'>('month');

  const formatVND = (value: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);

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
      const [statsData, managerData, categoriesData] = await Promise.all([
        statisticsService.getDashboardData(queryParams),
        statisticsService.getManagerDetailedStats(queryParams),
        productService.getCategories().catch(() => []),
      ]);
      setStats(statsData);
      setManagerStats(managerData);
      setCategories(categoriesData);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu doanh thu. Vui lòng thử lại sau.');
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
      await statisticsService.exportManagerStats('revenue', queryParams);
      toast.success('Xuất báo cáo doanh thu thành công!');
    } catch {
      toast.error('Không thể xuất báo cáo doanh thu.');
    } finally {
      setExporting(false);
    }
  };

  const branchRevenue = useMemo(() => {
    if (!managerStats?.revenueByFacility) return [];
    return managerStats.revenueByFacility.map((f) => ({
      name: f.name,
      revenue: f.revenue,
      orders: f.orderCount,
      share: f.share,
    }));
  }, [managerStats]);

  const categoryRevenue = useMemo(() => {
    if (!managerStats?.revenueByCategory) return [];
    return managerStats.revenueByCategory.map((c) => ({
      name: c.name,
      revenue: c.revenue,
      share: c.share,
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
                : 'Phân tích dòng tiền theo thời gian, theo chi nhánh và theo danh mục sản phẩm.'}
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
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
                <p className="text-label-xs font-bold text-secondary uppercase tracking-wider">Doanh Thu Tổng</p>
                <h2 className="text-headline-lg font-bold text-on-surface mt-1">{formatVND(stats.grossRevenue)}</h2>
              </div>
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
                <p className="text-label-xs font-bold text-secondary uppercase tracking-wider">Lợi Nhuận Ước Tính (35%)</p>
                <h2 className="text-headline-lg font-bold text-tertiary mt-1">{formatVND(stats.netProfit)}</h2>
              </div>
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
                <p className="text-label-xs font-bold text-secondary uppercase tracking-wider">Giá Trị Đơn Hàng TB</p>
                <h2 className="text-headline-lg font-bold text-on-surface mt-1">{formatVND(stats.avgOrderValue)}</h2>
              </div>
            </section>

            {/* Filter bar */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-sm border-b border-slate-border/30 pb-md">
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">Phân tích doanh thu chi tiết</h3>
                <p className="text-body-sm text-secondary">Phân tích dòng tiền theo thời gian, theo chi nhánh cửa hàng và theo danh mục sản phẩm.</p>
              </div>
              <div className="flex flex-wrap items-center gap-sm">
                {facilityName && (
                  <span className="flex items-center gap-xs px-md py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary text-body-xs font-semibold">
                    <MaterialIcon name="store" className="text-[15px]" />
                    Cơ sở: {facilityName}
                  </span>
                )}
                {categories.length > 0 && (
                  <select
                    className="rounded-lg border border-slate-border bg-bg-card px-md py-1.5 text-body-xs font-semibold text-secondary outline-none focus:border-primary"
                    onChange={(e) => {
                      const catId = e.target.value;
                      const name = catId === 'all' ? 'Tất cả' : categories.find(c => c.id === catId)?.name || '';
                      toast.info(`Đang lọc số liệu cho danh mục: ${name}`);
                    }}
                  >
                    <option value="all">Tất cả danh mục</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                <div className="flex items-center gap-xs bg-bg-soft p-1 rounded-lg border border-slate-border/40">
                  {[
                    { id: 'day', label: 'Theo Ngày' },
                    { id: 'month', label: 'Theo Tháng' },
                    { id: 'year', label: 'Theo Năm' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setRevenueFilter(opt.id as 'day' | 'month' | 'year')}
                      className={`px-sm py-1.5 rounded text-body-xs font-bold transition-all ${revenueFilter === opt.id
                        ? 'bg-bg-card text-primary shadow-sm'
                        : 'text-secondary hover:text-on-surface'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Branch Contribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
              {/* Branch Revenue Table */}
              <div className="bg-bg-card rounded-xl border border-slate-border shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="p-lg border-b border-slate-border/40">
                  <h3 className="text-body-md font-bold">Doanh Thu Theo Chi Nhánh</h3>
                  <p className="text-body-xs text-secondary">Được thống kê trên lượng hóa đơn thực nhận tại mỗi cơ sở.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-label-xs font-bold text-secondary uppercase border-b border-slate-border/40">
                      <tr>
                        <th className="px-lg py-3">Chi Nhánh</th>
                        <th className="px-lg py-3 text-right">Doanh Thu</th>
                        <th className="px-lg py-3 text-right">Đơn Hàng</th>
                        <th className="px-lg py-3 text-right">Tỷ Trọng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border/20 text-body-sm">
                      {branchRevenue.length === 0 ? (
                        <tr><td colSpan={4} className="px-lg py-8 text-center text-secondary">Chưa có dữ liệu.</td></tr>
                      ) : branchRevenue.map((branch) => (
                        <tr key={branch.name} className="hover:bg-slate-50/30">
                          <td className="px-lg py-4 font-semibold text-on-surface">{branch.name}</td>
                          <td className="px-lg py-4 text-right font-mono text-primary font-bold">{formatVND(branch.revenue)}</td>
                          <td className="px-lg py-4 text-right">{branch.orders.toLocaleString()} đơn</td>
                          <td className="px-lg py-4 text-right">
                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-label-xs font-bold">
                              {branch.share}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-lg bg-bg-soft/50 border-t border-slate-border/40">
                  <div className="flex justify-between items-center text-body-xs font-bold">
                    <span className="text-secondary">TỔNG CỘNG DOANH THU CHI NHÁNH</span>
                    <span className="text-primary font-mono text-body-md">{formatVND(branchRevenue.reduce((s, b) => s + b.revenue, 0))}</span>
                  </div>
                </div>
              </div>

              {/* Category Revenue Table */}
              <div className="bg-bg-card rounded-xl border border-slate-border shadow-sm overflow-hidden flex flex-col justify-between">
                <div className="p-lg border-b border-slate-border/40">
                  <h3 className="text-body-md font-bold">Doanh Thu Theo Danh Mục</h3>
                  <p className="text-body-xs text-secondary">Phân chia nguồn tiền thu được dựa trên chủng loại sản phẩm.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-label-xs font-bold text-secondary uppercase border-b border-slate-border/40">
                      <tr>
                        <th className="px-lg py-3">Danh Mục Sản Phẩm</th>
                        <th className="px-lg py-3 text-right">Doanh Thu</th>
                        <th className="px-lg py-3 text-right">Tỷ Trọng Doanh Số</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border/20 text-body-sm">
                      {categoryRevenue.length === 0 ? (
                        <tr><td colSpan={3} className="px-lg py-8 text-center text-secondary">Chưa có dữ liệu.</td></tr>
                      ) : categoryRevenue.map((cat) => (
                        <tr key={cat.name} className="hover:bg-slate-50/30">
                          <td className="px-lg py-4 font-semibold text-on-surface">{cat.name}</td>
                          <td className="px-lg py-4 text-right font-mono text-primary font-bold">{formatVND(cat.revenue)}</td>
                          <td className="px-lg py-4 text-right">
                            <div className="flex items-center justify-end gap-md">
                              <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                <div className="h-full bg-primary" style={{ width: `${cat.share}%` }}></div>
                              </div>
                              <span className="font-bold text-secondary">{cat.share}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-lg bg-bg-soft/50 border-t border-slate-border/40">
                  <div className="flex justify-between items-center text-body-xs font-bold">
                    <span className="text-secondary">TỔNG DOANH THU SẢN PHẨM</span>
                    <span className="text-primary font-mono text-body-md">{formatVND(categoryRevenue.reduce((s, c) => s + c.revenue, 0))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Distribution */}
            <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
              <h3 className="text-body-md font-bold mb-sm">Phân Phối Phương Thức Thanh Toán</h3>
              <p className="text-body-xs text-secondary mb-md">Tỷ lệ thanh toán thành công của đơn hàng.</p>
              <div className="space-y-sm">
                {stats.paymentDistribution.map((p) => (
                  <div key={p.method} className="space-y-xs">
                    <div className="flex justify-between text-body-xs font-semibold">
                      <span className="text-secondary">{p.method}</span>
                      <span className="text-on-surface">{p.percentage}% ({p.count} giao dịch)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManagerRevenueStats;

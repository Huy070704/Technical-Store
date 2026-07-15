import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { AdminLayout } from '../../components/admin';
import MaterialIcon from '../../components/admin/shared/MaterialIcon';
import { statisticsService, type DashboardStatistics, type ManagerDetailedStats } from '@/services/statisticsService';
import { ds } from '@/styles/designSystem';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

// ─── Custom Tooltip for Area Chart ───
const TrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const val = payload[0].value;
  const formattedVal = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
  return (
    <div className="rounded-lg border border-slate-border bg-bg-card px-md py-sm shadow-elevated text-body-sm">
      <p className="font-semibold text-on-surface mb-1">{label}</p>
      <p className="text-label-xs text-[#10b981] font-bold">
        Doanh thu: {formattedVal}
      </p>
    </div>
  );
};

// ─── Custom Tooltip for Bar Chart ───
const BarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-border bg-bg-card px-md py-sm shadow-elevated text-body-sm">
      <p className="font-semibold text-on-surface mb-1">{data.label}</p>
      <p className="text-label-xs text-secondary">
        Số lượng: <span className="font-semibold text-on-surface">{data.value.toLocaleString('vi-VN')} đơn</span>
      </p>
    </div>
  );
};

const ManagerDashboard = () => {
  const toast = useToast();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [managerStats, setManagerStats] = useState<ManagerDetailedStats | null>(null);

  // Tên cơ sở của manager lấy từ auth context
  const facilityName = useMemo(() => {
    if (!user?.facility) return null;
    if (typeof user.facility === 'object' && user.facility !== null) {
      return (user.facility as { id: string; name?: string }).name ?? null;
    }
    return null;
  }, [user]);

  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'custom'>('30days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    // Với khoảng tùy chọn: chỉ gọi API khi đã chọn đủ cả 2 mốc ngày
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
      setError('Không thể tải dữ liệu báo cáo thống kê. Vui lòng thử lại sau.');
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
      await statisticsService.exportReport(queryParams);
      toast.success('Báo cáo đã được xuất thành công!');
    } catch (err) {
      console.error(err);
      toast.error('Không thể xuất báo cáo doanh thu.');
    } finally {
      setExporting(false);
    }
  };

  // VND Currency formatter
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Format metric values (currency or number)
  const formatMetricValue = (value: number, isCurrency = true) => {
    if (!isCurrency) return value.toLocaleString('vi-VN');
    return formatVND(value);
  };

  // Customer stats from real DB data
  const customerStats = useMemo(() => {
    if (!managerStats) return { total: 0, newCust: 0, returningCust: 0, returningPercent: 0 };
    const { total, newLast30Days, returning } = managerStats.customerBreakdown;
    const returningPercent = total > 0 ? Math.round((returning / total) * 100) : 0;
    return { total, newCust: newLast30Days, returningCust: returning, returningPercent };
  }, [managerStats]);

  // Order statistics from real DB data
  const orderStats = useMemo(() => {
    if (!managerStats) return { total: 0, completed: 0, processing: 0, cancelled: 0, completedPercent: 0, cancelledPercent: 0 };
    const b = managerStats.orderStatusBreakdown;
    const completed = b.delivered + b.successful;
    const processing = b.pending + b.processing + b.shipping;
    const cancelled = b.cancelled;
    const total = b.total;
    const completedPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const cancelledPercent = total > 0 ? Math.round((cancelled / total) * 100) : 0;
    return { total, completed, processing, cancelled, completedPercent, cancelledPercent };
  }, [managerStats]);

  // Avg order value = grossRevenue / completed orders (tính chính xác từ DB)
  const avgOrderValue = useMemo(() => {
    if (!stats || !managerStats) return 0;
    const completed = managerStats.orderStatusBreakdown.delivered + managerStats.orderStatusBreakdown.successful;
    if (completed === 0) return 0;
    return Math.round(stats.grossRevenue / completed);
  }, [stats, managerStats]);

  // Calculate scaleMax for line chart Y axis
  const scaleMax = useMemo(() => {
    if (!stats || !stats.revenueTrend || stats.revenueTrend.length === 0) return 1000000;
    const maxVal = Math.max(...stats.revenueTrend.map((d) => Math.max(d.current, d.previous)), 1);
    return Math.ceil(maxVal / 1000000) * 1000000 || 1000000;
  }, [stats]);

  const formatYAxisTickVal = (val: number) => {
    if (val === 0) return '0';
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
    return `${val}`;
  };

  // Bar Chart Data for Order Status Distribution
  const barData = useMemo(() => {
    if (!managerStats) {
      return [
        { label: 'Chờ xử lý', value: 0, color: '#f59e0b' },
        { label: 'Đang giao', value: 0, color: '#3b82f6' },
        { label: 'Đã giao', value: 0, color: '#15803d' },
        { label: 'Đã hủy', value: 0, color: '#b91c1c' },
      ];
    }
    const b = managerStats.orderStatusBreakdown;
    return [
      { label: 'Chờ xử lý', value: (b.pending || 0) + (b.processing || 0), color: '#e28704' },
      { label: 'Đang giao',  value: (b.shipping || 0) + (b.deliveryFailed || 0), color: '#2563eb' },
      { label: 'Đã giao',   value: (b.delivered || 0) + (b.successful || 0), color: '#15803d' },
      { label: 'Đã hủy',   value: b.cancelled || 0, color: '#b91c1c' },
    ];
  }, [managerStats]);

  // Khi chuyển sang custom mà chưa đủ ngày: hiện màn hình chờ chọn ngày
  const isWaitingForCustomDates = timeRange === 'custom' && (!customStartDate || !customEndDate);

  return (
    <AdminLayout>
      <div className="space-y-lg mx-auto max-w-7xl pb-10">

        {/* Upper Header Grid */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-md bg-bg-card p-lg rounded-xl shadow-sm border border-slate-border">
          <div>
            <div className="flex items-center gap-sm text-primary font-bold text-body-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse"></span>
              QUẢN LÝ CỬA HÀNG
              {facilityName && (
                <span className="ml-xs px-sm py-0.5 rounded-full bg-primary/10 text-primary text-label-xs font-semibold border border-primary/20">
                  <MaterialIcon name="store" className="text-[13px] align-middle mr-0.5" />
                  {facilityName}
                </span>
              )}
            </div>
            <h1 className="text-headline-xl text-on-surface font-bold mt-1">Bảng điều khiển Tổng quan</h1>
            <p className="text-body-sm text-secondary">
              {facilityName
                ? `Thống kê dành riêng cho cơ sở: ${facilityName}`
                : 'Giám sát tổng quan kinh doanh, phân tích hiệu suất và quản lý báo cáo.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-sm">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="bg-primary text-on-primary text-label-md px-lg py-2.5 rounded-lg font-semibold hover:bg-primary-hover hover:shadow-md active:scale-[0.98] flex items-center gap-xs transition-all duration-200"
            >
              <MaterialIcon name={exporting ? 'sync' : 'file_download'} className={exporting ? 'animate-spin' : ''} />
              {exporting ? 'Đang xuất...' : 'Xuất Báo Cáo'}
            </button>
          </div>
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

        {/* ── Waiting for custom dates ── */}
        {isWaitingForCustomDates ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-slate-border bg-bg-card shadow-sm">
            <div className="flex flex-col items-center gap-sm text-secondary">
              <MaterialIcon name="date_range" className="text-[48px]" />
              <p className="font-semibold">Vui lòng chọn đủ hai mốc ngày để xem thống kê</p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex h-96 items-center justify-center rounded-xl border border-slate-border/50 bg-bg-card shadow-sm animate-pulse">
            <div className="flex flex-col items-center gap-sm">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span>
              <div className="text-secondary font-semibold">Đang tải báo cáo thống kê cho Quản lý...</div>
            </div>
          </div>
        ) : error || !stats ? (
          <div className="rounded-xl border border-error/20 bg-error-container/20 p-xl text-center">
            <span className="material-symbols-outlined text-[48px] text-error">warning</span>
            <p className="mt-md text-error font-medium">{error || 'Không tìm thấy dữ liệu thống kê.'}</p>
            <button
              onClick={() => void fetchData()}
              className="mt-lg bg-primary text-white text-label-md px-lg py-sm rounded hover:bg-primary-hover font-bold transition-all"
            >
              Thử lại
            </button>
          </div>
        ) : (
          <div className="space-y-lg animate-fade-in">
            {/* KPI Cards Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">

              {/* Gross Revenue Card */}
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-label-xs font-bold text-secondary uppercase tracking-wider">Doanh Thu Tổng</p>
                    <h2 className="text-headline-xl font-bold text-on-surface mt-1">
                      {formatMetricValue(stats.grossRevenue)}
                    </h2>
                  </div>
                  <div className="p-sm rounded-lg bg-primary-light text-primary">
                    <MaterialIcon name="payments" />
                  </div>
                </div>
                <div className="mt-md flex items-center justify-between text-body-xs border-t border-slate-border/30 pt-md">
                  <span className="text-tertiary font-bold flex items-center gap-0.5">
                    <MaterialIcon name="shopping_bag" className="text-sm" />
                    {orderStats.completed} đơn hoàn thành
                  </span>
                  <span className="text-secondary font-mono">{orderStats.total} tổng đơn</span>
                </div>
              </div>

              {/* Net Profit Card */}
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-label-xs font-bold text-secondary uppercase tracking-wider">Lợi Nhuận Ước Tính (35%)</p>
                    <h2 className="text-headline-xl font-bold text-on-surface mt-1">
                      {formatMetricValue(stats.netProfit)}
                    </h2>
                  </div>
                  <div className="p-sm rounded-lg bg-tertiary/10 text-tertiary">
                    <MaterialIcon name="monetization_on" />
                  </div>
                </div>
                <div className="mt-md flex items-center justify-between text-body-xs border-t border-slate-border/30 pt-md">
                  <span className="text-tertiary font-bold flex items-center gap-0.5">
                    <MaterialIcon name="percent" className="text-sm" />
                    35% trên doanh thu
                  </span>
                  <span className="text-secondary font-mono">{formatMetricValue(stats.grossRevenue)}</span>
                </div>
              </div>

              {/* Avg Order Value Card */}
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-label-xs font-bold text-secondary uppercase tracking-wider">Giá Trị Đơn Hàng TB</p>
                    <h2 className="text-headline-xl font-bold text-on-surface mt-1">
                      {formatMetricValue(avgOrderValue)}
                    </h2>
                  </div>
                  <div className="p-sm rounded-lg bg-warning/10 text-warning">
                    <MaterialIcon name="receipt" />
                  </div>
                </div>
                <div className="mt-md flex items-center justify-between text-body-xs border-t border-slate-border/30 pt-md">
                  <span className="text-secondary font-bold flex items-center gap-0.5">
                    <MaterialIcon name="functions" className="text-sm" />
                    Doanh thu / đơn hoàn thành
                  </span>
                  <span className="text-secondary font-mono">{orderStats.completed} đơn</span>
                </div>
              </div>

              {/* Total Orders */}
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-label-xs font-bold text-secondary uppercase tracking-wider">Tổng Đơn Hàng</p>
                    <h2 className="text-headline-xl font-bold text-on-surface mt-1">
                      {formatMetricValue(orderStats.total, false)}
                    </h2>
                  </div>
                  <div className="p-sm rounded-lg bg-surface-container-highest text-on-surface">
                    <MaterialIcon name="shopping_cart" />
                  </div>
                </div>
                <div className="mt-md flex items-center justify-between text-body-xs border-t border-slate-border/30 pt-md">
                  <span className="text-tertiary font-bold flex items-center gap-0.5">
                    <MaterialIcon name="check_circle" className="text-sm" />
                    {orderStats.completedPercent}% hoàn thành
                  </span>
                  <span className="text-error font-semibold">{orderStats.cancelledPercent}% đã hủy</span>
                </div>
              </div>

              {/* Total Customers */}
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-label-xs font-bold text-secondary uppercase tracking-wider">Khách Hàng</p>
                    <h2 className="text-headline-xl font-bold text-on-surface mt-1">
                      {formatMetricValue(customerStats.total, false)}
                    </h2>
                  </div>
                  <div className="p-sm rounded-lg bg-primary-light text-primary">
                    <MaterialIcon name="group" />
                  </div>
                </div>
                <div className="mt-md flex items-center justify-between text-body-xs border-t border-slate-border/30 pt-md">
                  <span className="text-tertiary font-bold flex items-center gap-0.5">
                    <MaterialIcon name="person_add" className="text-sm" />
                    {customerStats.newCust} khách mới
                  </span>
                  <span className="text-secondary">Quay lại: {customerStats.returningPercent}%</span>
                </div>
              </div>

              {/* Inventory Status */}
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-label-xs font-bold text-secondary uppercase tracking-wider">Tình Trạng Kho</p>
                    <h2 className="text-headline-xl font-bold text-on-surface mt-1">
                      {stats.lowStockItems + stats.outOfStockItems} Cảnh báo
                    </h2>
                  </div>
                  <div className={`p-sm rounded-lg ${stats.outOfStockItems > 0 ? 'bg-error-container text-error' : 'bg-warning/10 text-warning'}`}>
                    <MaterialIcon name="warning" />
                  </div>
                </div>
                <div className="mt-md flex items-center justify-between text-body-xs border-t border-slate-border/30 pt-md">
                  <span className="text-error font-bold">{stats.outOfStockItems} hết hàng</span>
                  <span className="text-warning font-bold">{stats.lowStockItems} tồn kho thấp</span>
                </div>
              </div>

            </section>

            {/* Critical Banners */}
            {(stats.lowStockItems > 0 || stats.outOfStockItems > 0) && (
              <div className={`${ds.alert.base} ${ds.alert.error} my-md`}>
                <div className="flex gap-md items-start">
                  <MaterialIcon name="inventory_2" className="text-xl mt-0.5" />
                  <div>
                    <h4 className="font-bold">Yêu cầu kiểm kê và đặt hàng</h4>
                    <p className="text-body-xs mt-1">
                      Hệ thống phát hiện có <strong>{stats.outOfStockItems} sản phẩm đã hết hàng</strong> hoàn toàn và <strong>{stats.lowStockItems} sản phẩm sắp hết hàng</strong> (dưới ngưỡng 10 sản phẩm). Vui lòng kiểm tra mục Tồn kho để tạo yêu cầu điều chỉnh.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
              {/* Left Chart: Xu hướng Doanh thu */}
              <div className="lg:col-span-2 bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-body-md font-bold text-on-surface">Xu hướng Doanh thu</h3>
                  <p className="text-body-xs text-secondary">Doanh thu thuần từ các đơn hàng đã hoàn thành và thanh toán thành công</p>
                </div>

                <div className="h-64 w-full mt-lg">
                  {stats.revenueTrend && stats.revenueTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.revenueTrend} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradRevenueManager" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="date"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => formatYAxisTickVal(v) + ' đ'}
                          domain={[0, scaleMax]}
                        />
                        <Tooltip content={<TrendTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="current"
                          name="Doanh thu"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#gradRevenueManager)"
                          dot={{ r: 3.5, stroke: '#fff', strokeWidth: 1.5, fill: '#10b981' }}
                          activeDot={{ r: 5 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-secondary text-body-xs">
                      Chưa có dữ liệu xu hướng doanh thu.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Chart: Phân bổ Trạng thái Đơn hàng */}
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-body-md font-bold text-on-surface">Phân bổ Trạng thái Đơn hàng</h3>
                  <p className="text-body-xs text-secondary">Số lượng đơn hàng được đặt theo trạng thái</p>
                </div>

                <div className="h-64 w-full mt-lg">
                  {barData && barData.some(d => d.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="label"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<BarTooltip />} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          {barData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-secondary text-body-xs">
                      Chưa có dữ liệu phân bổ trạng thái đơn hàng.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Links to Stats Pages */}
            <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
              <h3 className="text-body-md font-bold mb-xs">Truy cập nhanh Báo cáo</h3>
              <p className="text-body-xs text-secondary mb-md">Xem chi tiết và xuất báo cáo từng phần qua thanh điều hướng bên trái.</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
                {[
                  { label: 'TK Doanh thu', icon: 'payments', path: '/manager/stats/revenue', color: 'bg-primary/10 text-primary' },
                  { label: 'TK Đơn hàng', icon: 'shopping_bag', path: '/manager/stats/orders', color: 'bg-tertiary/10 text-tertiary' },
                  { label: 'TK Sản phẩm', icon: 'inventory_2', path: '/manager/stats/products', color: 'bg-warning/10 text-warning' },
                  { label: 'TK Khách hàng', icon: 'group', path: '/manager/stats/customers', color: 'bg-secondary/10 text-secondary' },
                ].map((item) => (
                  <a
                    key={item.label}
                    href={item.path}
                    className="flex flex-col items-center justify-center gap-sm p-lg rounded-xl border border-slate-border hover:border-primary/30 hover:shadow-md transition-all group"
                  >
                    <div className={`p-md rounded-full ${item.color} group-hover:scale-110 transition-transform`}>
                      <MaterialIcon name={item.icon} className="text-[22px]" />
                    </div>
                    <span className="text-body-xs font-bold text-on-surface text-center">{item.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default ManagerDashboard;

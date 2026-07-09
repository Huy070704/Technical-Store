import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '../../components/admin';
import MaterialIcon from '../../components/admin/shared/MaterialIcon';
import { statisticsService, type DashboardStatistics, type ManagerDetailedStats } from '@/services/statisticsService';
import { ds } from '@/styles/designSystem';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsData, managerData] = await Promise.all([
        statisticsService.getDashboardData(),
        statisticsService.getManagerDetailedStats(),
      ]);
      setStats(statsData);
      setManagerStats(managerData);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu báo cáo thống kê. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleExport = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      await statisticsService.exportReport();
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
    if (!managerStats) return { total: 0, completed: 0, processing: 0, cancelled: 0 };
    const b = managerStats.orderStatusBreakdown;
    const completed = b.delivered + b.successful;
    const processing = b.pending + b.processing + b.shipping;
    const cancelled = b.cancelled;
    return { total: b.total, completed, processing, cancelled };
  }, [managerStats]);

  // SVG Chart Polyline Points Builder
  const chartPoints = useMemo(() => {
    if (!stats || !stats.revenueTrend || stats.revenueTrend.length === 0) {
      return { current: '', previous: '' };
    }
    const maxVal = Math.max(
      ...stats.revenueTrend.map((d) => Math.max(d.current, d.previous)),
      1,
    );
    const len = stats.revenueTrend.length;
    const current = stats.revenueTrend
      .map((d, i) => `${(i / (len - 1)) * 100},${90 - (d.current / maxVal) * 75}`)
      .join(' ');
    const previous = stats.revenueTrend
      .map((d, i) => `${(i / (len - 1)) * 100},${90 - (d.previous / maxVal) * 75}`)
      .join(' ');

    return { current, previous };
  }, [stats]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center rounded-xl border border-slate-border/50 bg-bg-card shadow-sm animate-pulse">
          <div className="flex flex-col items-center gap-sm">
            <span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span>
            <div className="text-secondary font-semibold">Đang tải báo cáo thống kê cho Quản lý...</div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !stats) {
    return (
      <AdminLayout>
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
      </AdminLayout>
    );
  }

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

        {/* KPI Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md animate-fade-in">

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
                <MaterialIcon name="trending_up" className="text-sm" /> +12.4% tháng này
              </span>
              <span className="text-secondary font-mono">So với tháng trước</span>
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
                <MaterialIcon name="trending_up" className="text-sm" /> +5.2%
              </span>
              <span className="text-secondary font-mono">Biên lợi nhuận gộp</span>
            </div>
          </div>

          {/* Avg Order Value Card */}
          <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-label-xs font-bold text-secondary uppercase tracking-wider">Giá Trị Đơn Hàng TB</p>
                <h2 className="text-headline-xl font-bold text-on-surface mt-1">
                  {formatMetricValue(stats.avgOrderValue)}
                </h2>
              </div>
              <div className="p-sm rounded-lg bg-warning/10 text-warning">
                <MaterialIcon name="receipt" />
              </div>
            </div>
            <div className="mt-md flex items-center justify-between text-body-xs border-t border-slate-border/30 pt-md">
              <span className="text-error font-bold flex items-center gap-0.5">
                <MaterialIcon name="trending_down" className="text-sm" /> -1.2%
              </span>
              <span className="text-secondary font-mono">Đơn hàng trực tuyến + quầy</span>
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
                <MaterialIcon name="trending_up" className="text-sm" /> +{orderStats.total > 0 ? ((orderStats.completed / orderStats.total) * 100).toFixed(0) : 0}% hoàn thành
              </span>
              <span className="text-secondary">Tỷ lệ hủy: {orderStats.total > 0 ? ((orderStats.cancelled / orderStats.total) * 100).toFixed(1) : 0}%</span>
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
                {customerStats.newCust} khách mới (30 ngày)
              </span>
              <span className="text-secondary">Quay lại: {customerStats.returningPercent}%</span>
            </div>
          </div>

          {/* Product Count & Stock Alert */}
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

        {/* Mini Trend and Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
          <div className="lg:col-span-2 bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
            <div className="flex justify-between items-center mb-md">
              <div>
                <h3 className="text-body-md font-bold">Xu Hướng Doanh Thu (30 ngày qua)</h3>
                <p className="text-body-xs text-secondary">So sánh doanh thu thực tế giữa tháng hiện tại và tháng trước.</p>
              </div>
              <div className="flex gap-md text-label-xs font-semibold text-secondary">
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary"></span> Tháng này</div>
                <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Tháng trước</div>
              </div>
            </div>
            <div className="h-60 relative w-full border-b border-l border-slate-border/40 mt-md pt-lg">
              {/* SVG Chart */}
              <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                <polyline fill="none" points={chartPoints.previous} stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3"></polyline>
                <polyline fill="none" points={chartPoints.current} stroke="#ba1a1a" strokeWidth="2.5"></polyline>
              </svg>
              <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[10px] text-secondary font-mono">
                <span>Ngày 01</span><span>Ngày 07</span><span>Ngày 14</span><span>Ngày 21</span><span>Ngày 28</span><span>Ngày 30</span>
              </div>
            </div>
          </div>

          {/* Quick Info Drawer */}
          <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-body-md font-bold mb-sm">Phân Phối Phương Thức Thanh Toán</h3>
              <p className="text-body-xs text-secondary mb-md">Tỷ lệ thanh toán thành công của đơn hàng.</p>
            </div>
            <div className="space-y-sm">
              {stats.paymentDistribution.map((p) => (
                <div key={p.method} className="space-y-xs">
                  <div className="flex justify-between text-body-xs font-semibold">
                    <span className="text-secondary">{p.method}</span>
                    <span className="text-on-surface">{p.percentage}% ({p.count} giao dịch)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${p.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-bg-soft rounded-lg p-md mt-lg border border-slate-border/30">
              <p className="text-body-xs font-bold text-on-surface">Thông tin Live Feed</p>
              <p className="text-label-xs text-secondary mt-1">Đơn hàng hoàn tất gần nhất vào lúc {new Date().toLocaleTimeString('vi-VN')}.</p>
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
    </AdminLayout>
  );
};

export default ManagerDashboard;

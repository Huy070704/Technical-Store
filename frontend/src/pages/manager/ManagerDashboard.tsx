import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '../../components/admin';
import MaterialIcon from '../../components/admin/shared/MaterialIcon';
import { statisticsService, type DashboardStatistics, type ManagerDetailedStats } from '@/services/statisticsService';
import { productService } from '@/services/productService';
import type { Category } from '@/types/product';
import { ds } from '@/styles/designSystem';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

type TabType = 'overview' | 'customers' | 'products' | 'orders' | 'revenue' | 'export';

const ManagerDashboard = () => {
  const toast = useToast();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [managerStats, setManagerStats] = useState<ManagerDetailedStats | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

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
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [revenueFilter, setRevenueFilter] = useState<'day' | 'month' | 'year'>('month');
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<'sales' | 'inventory' | 'customers'>('sales');

  // Interactive filters & searches
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsData, managerData, categoriesData] = await Promise.all([
        statisticsService.getDashboardData(),
        statisticsService.getManagerDetailedStats(),
        productService.getCategories().catch(() => []),
      ]);
      setStats(statsData);
      setManagerStats(managerData);
      setCategories(categoriesData);
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

  // Top purchasing customers from real DB data
  const topPurchasingCustomers = useMemo(() => {
    if (!managerStats?.topCustomers) return [];
    const customers = managerStats.topCustomers.map((c) => ({
      name: c.name,
      email: c.email,
      count: c.orderCount,
      total: c.totalSpent,
    }));
    if (!customerSearch) return customers;
    return customers.filter(c =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(customerSearch.toLowerCase())
    );
  }, [managerStats, customerSearch]);

  // Slow-moving products from real DB data
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

  // Filtered top selling products
  const filteredTopProducts = useMemo(() => {
    if (!stats?.topProducts) return [];
    if (!productSearch) return stats.topProducts;
    return stats.topProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()));
  }, [stats, productSearch]);

  // Order statistics from real DB data
  const orderStats = useMemo(() => {
    if (!managerStats) return { total: 0, completed: 0, processing: 0, cancelled: 0 };
    const b = managerStats.orderStatusBreakdown;
    const completed = b.delivered + b.successful;
    const processing = b.pending + b.assigned + b.processing + b.shipping;
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

  // Branch revenue from real DB data
  const branchRevenue = useMemo(() => {
    if (!managerStats?.revenueByFacility) return [];
    return managerStats.revenueByFacility.map((f) => ({
      name: f.name,
      revenue: f.revenue,
      orders: f.orderCount,
      share: f.share,
    }));
  }, [managerStats]);

  // Category revenue from real DB data
  const categoryRevenue = useMemo(() => {
    if (!managerStats?.revenueByCategory) return [];
    return managerStats.revenueByCategory.map((c) => ({
      name: c.name,
      revenue: c.revenue,
      share: c.share,
    }));
  }, [managerStats]);

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
            <h1 className="text-headline-xl text-on-surface font-bold mt-1">Bảng điều khiển Báo cáo</h1>
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

        {/* Tab Buttons Navigation */}
        <div className="flex flex-wrap items-center border-b border-slate-border/50 gap-sm bg-bg-card p-xs rounded-lg border">
          {[
            { id: 'overview', label: 'Tổng quan', icon: 'grid_view' },
            { id: 'revenue', label: 'Thống kê Doanh thu', icon: 'payments' },
            { id: 'orders', label: 'Thống kê Đơn hàng', icon: 'shopping_bag' },
            { id: 'products', label: 'Thống kê Sản phẩm', icon: 'inventory_2' },
            { id: 'customers', label: 'Thống kê Khách hàng', icon: 'group' },
            { id: 'export', label: 'Xuất File Báo cáo', icon: 'download' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-sm px-lg py-3 rounded-lg text-body-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              <MaterialIcon name={tab.icon} className="text-[18px]" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="space-y-lg">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
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
                        Hệ thống phát hiện có <strong>{stats.outOfStockItems} sản phẩm đã hết hàng</strong> hoàn toàn và <strong>{stats.lowStockItems} sản phẩm sắp hết hàng</strong> (dưới ngưỡng 10 sản phẩm). Vui lòng chuyển hướng sang tab Tồn kho để tạo yêu cầu điều chỉnh.
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
                      {/* Previous Month Line */}
                      <polyline fill="none" points={chartPoints.previous} stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3"></polyline>
                      {/* Current Month Line */}
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
            </div>
          )}

          {/* REVENUE STATISTICS TAB */}
          {activeTab === 'revenue' && (
            <div className="space-y-lg animate-fade-in">
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-sm border-b border-slate-border/30 pb-md">
                <div>
                  <h3 className="text-headline-sm font-bold text-on-surface">Thống kê doanh thu</h3>
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
                  
                  {/* Time filter options */}
                  <div className="flex items-center gap-xs bg-bg-soft p-1 rounded-lg border border-slate-border/40">
                    {[
                      { id: 'day', label: 'Theo Ngày' },
                      { id: 'month', label: 'Theo Tháng' },
                      { id: 'year', label: 'Theo Năm' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => setRevenueFilter(opt.id as 'day' | 'month' | 'year')}
                        className={`px-sm py-1.5 rounded text-body-xs font-bold transition-all ${
                          revenueFilter === opt.id
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
                        {branchRevenue.map((branch) => (
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
                        {categoryRevenue.map((cat) => (
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
            </div>
          )}

          {/* ORDER STATISTICS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-lg animate-fade-in">
              <div className="border-b border-slate-border/30 pb-md">
                <h3 className="text-headline-sm font-bold text-on-surface">Thống kê đơn hàng</h3>
                <p className="text-body-sm text-secondary">Theo dõi số lượng đơn hàng, tỷ lệ chuyển đổi, tỷ lệ hủy đơn và trạng thái xử lý.</p>
              </div>

              {/* Order Status Cards Grid */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-md">
                
                <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
                  <p className="text-label-xs font-bold text-secondary uppercase">Tổng Số Đơn</p>
                  <h3 className="text-headline-lg font-bold text-on-surface mt-1">{orderStats.total} đơn</h3>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-md overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '100%' }}></div>
                  </div>
                </div>

                <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
                  <p className="text-label-xs font-bold text-tertiary uppercase">Đơn Hoàn Thành</p>
                  <h3 className="text-headline-lg font-bold text-tertiary mt-1">{orderStats.completed} đơn</h3>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-md overflow-hidden">
                    <div className="h-full bg-tertiary" style={{ width: `${(orderStats.completed / orderStats.total) * 100}%` }}></div>
                  </div>
                </div>

                <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
                  <p className="text-label-xs font-bold text-warning uppercase">Đơn Đang Xử Lý</p>
                  <h3 className="text-headline-lg font-bold text-warning mt-1">{orderStats.processing} đơn</h3>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-md overflow-hidden">
                    <div className="h-full bg-warning" style={{ width: `${(orderStats.processing / orderStats.total) * 100}%` }}></div>
                  </div>
                </div>

                <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
                  <p className="text-label-xs font-bold text-error uppercase">Đơn Đã Hủy</p>
                  <h3 className="text-headline-lg font-bold text-error mt-1">{orderStats.cancelled} đơn</h3>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full mt-md overflow-hidden">
                    <div className="h-full bg-error" style={{ width: `${(orderStats.cancelled / orderStats.total) * 100}%` }}></div>
                  </div>
                </div>

              </section>

              {/* Recent Transactions List */}
              <div className="bg-bg-card rounded-xl border border-slate-border shadow-sm overflow-hidden">
                <div className="p-lg border-b border-slate-border/40 flex justify-between items-center">
                  <div>
                    <h3 className="text-body-md font-bold">Giao Dịch Gần Nhất</h3>
                    <p className="text-body-xs text-secondary">Danh sách hóa đơn phát sinh mới trong hệ thống.</p>
                  </div>
                  <span className="text-label-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                    Thực tế phát sinh
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-label-xs font-bold text-secondary uppercase border-b border-slate-border/40">
                      <tr>
                        <th className="px-lg py-3">Mã Giao Dịch</th>
                        <th className="px-lg py-3">Khách Hàng / Đối tác</th>
                        <th className="px-lg py-3">Trạng Thái</th>
                        <th className="px-lg py-3 text-right">Số Tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border/20 text-body-sm">
                      {stats.recentTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/30">
                          <td className="px-lg py-4 font-mono font-bold text-secondary">{tx.id}</td>
                          <td className="px-lg py-4 text-on-surface">{tx.entity}</td>
                          <td className="px-lg py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-label-xs font-bold ${
                              tx.status === 'Settled' ? 'bg-tertiary/10 text-tertiary' : 'bg-surface-container-high text-on-surface-variant'
                            }`}>
                              {tx.status === 'Settled' ? 'Thành công' : 'Chờ xử lý'}
                            </span>
                          </td>
                          <td className="px-lg py-4 text-right font-mono font-bold text-on-surface">
                            {formatMetricValue(tx.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* PRODUCT STATISTICS TAB */}
          {activeTab === 'products' && (
            <div className="space-y-lg animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-md border-b border-slate-border/30 pb-md">
                <div>
                  <h3 className="text-headline-sm font-bold text-on-surface">Thống kê sản phẩm</h3>
                  <p className="text-body-sm text-secondary">Phân tích danh mục hàng bán chạy, hàng bán chậm để cân đối tồn kho hợp lý.</p>
                </div>
                
                {/* Product Search Filter */}
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
                        {filteredTopProducts.map((p) => (
                          <tr key={p.name} className="hover:bg-slate-50/30">
                            <td className="px-lg py-4 text-center font-bold text-secondary w-16">{p.rank}</td>
                            <td className="px-lg py-4 font-semibold text-on-surface">{p.name}</td>
                            <td className="px-lg py-4 text-right font-semibold">{p.quantity.toLocaleString()} chiếc</td>
                            <td className="px-lg py-4 text-right font-mono text-primary font-bold">{formatMetricValue(p.revenue)}</td>
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
                        {slowProducts.map((p) => (
                          <tr key={p.name} className="hover:bg-slate-50/30">
                            <td className="px-md py-3 font-semibold text-on-surface truncate max-w-[150px]" title={p.name}>{p.name}</td>
                            <td className="px-md py-3 text-right text-warning font-bold">{p.stock}</td>
                            <td className="px-md py-3 text-right text-secondary">{p.sales30d} cái</td>
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

          {/* CUSTOMERS TAB */}
          {activeTab === 'customers' && (
            <div className="space-y-lg animate-fade-in">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-md border-b border-slate-border/30 pb-md">
                <div>
                  <h3 className="text-headline-sm font-bold text-on-surface">Thống kê khách hàng</h3>
                  <p className="text-body-sm text-secondary">Theo dõi số lượng khách mới, khách quay lại và chân dung các khách hàng mua nhiều nhất.</p>
                </div>
                
                {/* Search customer input */}
                <div className="relative max-w-xs w-full">
                  <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Tìm tên hoặc email khách..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-border bg-bg-card rounded-lg text-body-sm outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Summary Customer Cards & Top Customer Table */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
                
                {/* Customer Breakdown ratios */}
                <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm flex flex-col justify-between h-fit gap-lg">
                  <div>
                    <h3 className="text-body-md font-bold mb-sm">Phân Loại Khách Hàng</h3>
                    <p className="text-body-xs text-secondary">Tỷ lệ tương quan giữa khách cũ và khách mới.</p>
                  </div>
                  <div className="flex flex-col items-center justify-center py-md">
                    {/* Visual Progress ring/bar mockup */}
                    <div className="relative w-36 h-36 rounded-full border-[14px] border-slate-100 flex items-center justify-center">
                      <div className="absolute inset-[-14px] rounded-full border-[14px] border-primary border-r-transparent border-b-transparent rotate-[45deg]"></div>
                      <div className="text-center">
                        <span className="block text-headline-xl font-bold">{customerStats.returningPercent}%</span>
                        <span className="text-label-xs text-secondary">Quay lại</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-sm border-t border-slate-border/30 pt-md">
                    <div className="flex justify-between text-body-xs font-semibold">
                      <span className="text-secondary flex items-center gap-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary"></span> Khách hàng quay lại (Returning)
                      </span>
                      <span>{customerStats.returningCust}</span>
                    </div>
                    <div className="flex justify-between text-body-xs font-semibold">
                      <span className="text-secondary flex items-center gap-xs">
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Khách hàng mới (New)
                      </span>
                      <span>{customerStats.newCust}</span>
                    </div>
                  </div>
                </div>

                {/* Top purchasing table */}
                <div className="lg:col-span-2 bg-bg-card rounded-xl border border-slate-border shadow-sm overflow-hidden flex flex-col justify-between">
                  <div className="p-lg border-b border-slate-border/40">
                    <h3 className="text-body-md font-bold text-primary">Khách Hàng Mua Nhiều Nhất</h3>
                    <p className="text-body-xs text-secondary">Những khách hàng đóng góp doanh thu lớn nhất cho cửa hàng.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50 text-label-xs font-bold text-secondary uppercase border-b border-slate-border/40">
                        <tr>
                          <th className="px-lg py-3">#</th>
                          <th className="px-lg py-3">Họ và Tên</th>
                          <th className="px-lg py-3">Email</th>
                          <th className="px-lg py-3 text-right">Số Đơn</th>
                          <th className="px-lg py-3 text-right">Tổng Mua</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-border/20 text-body-sm">
                        {topPurchasingCustomers.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-lg py-8 text-center text-secondary">
                              Chưa có dữ liệu khách hàng mua hàng.
                            </td>
                          </tr>
                        )}
                        {topPurchasingCustomers.map((cust, idx) => (
                          <tr key={cust.email || idx} className="hover:bg-slate-50/30">
                            <td className="px-lg py-4 font-bold text-secondary">{idx + 1}</td>
                            <td className="px-lg py-4 font-semibold text-on-surface">{cust.name}</td>
                            <td className="px-lg py-4 text-secondary">{cust.email}</td>
                            <td className="px-lg py-4 text-right">{cust.count} đơn</td>
                            <td className="px-lg py-4 text-right font-mono font-bold text-primary">{formatVND(cust.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* EXPORT REPORTS TAB */}
          {activeTab === 'export' && (
            <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm space-y-lg animate-fade-in">
              <div className="border-b border-slate-border/30 pb-md">
                <h3 className="text-headline-sm font-bold text-on-surface">Xuất báo cáo dữ liệu</h3>
                <p className="text-body-sm text-secondary">Xuất dữ liệu thống kê từ hệ thống sang tệp tin Excel phục vụ mục đích lưu trữ và đối soát quản lý.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
                <div className="md:col-span-2 space-y-md">
                  <div className="space-y-sm">
                    <label className="block text-body-sm font-bold text-on-surface">1. Chọn loại báo cáo cần kết xuất:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
                      
                      <button
                        onClick={() => setExportType('sales')}
                        className={`flex flex-col items-center justify-center p-lg rounded-xl border text-center transition-all ${
                          exportType === 'sales'
                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                            : 'border-slate-border hover:border-slate-400 bg-bg-card'
                        }`}
                      >
                        <MaterialIcon name="payments" className="text-3xl mb-2" />
                        <span className="text-body-sm font-bold">Báo cáo Doanh thu</span>
                        <span className="text-label-xs text-secondary mt-1">Xu hướng bán hàng, doanh thu chi nhánh</span>
                      </button>

                      <button
                        onClick={() => setExportType('inventory')}
                        className={`flex flex-col items-center justify-center p-lg rounded-xl border text-center transition-all ${
                          exportType === 'inventory'
                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                            : 'border-slate-border hover:border-slate-400 bg-bg-card'
                        }`}
                      >
                        <MaterialIcon name="inventory" className="text-3xl mb-2" />
                        <span className="text-body-sm font-bold">Báo cáo Kho hàng</span>
                        <span className="text-label-xs text-secondary mt-1">Danh sách tồn kho, hàng hết hạn, xoay vòng</span>
                      </button>

                      <button
                        onClick={() => setExportType('customers')}
                        className={`flex flex-col items-center justify-center p-lg rounded-xl border text-center transition-all ${
                          exportType === 'customers'
                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                            : 'border-slate-border hover:border-slate-400 bg-bg-card'
                        }`}
                      >
                        <MaterialIcon name="group" className="text-3xl mb-2" />
                        <span className="text-body-sm font-bold">Báo cáo Khách hàng</span>
                        <span className="text-label-xs text-secondary mt-1">Chi tiêu khách hàng, danh sách VIP</span>
                      </button>

                    </div>
                  </div>

                  <div className="space-y-sm">
                    <label className="block text-body-sm font-bold text-on-surface">2. Lựa chọn định dạng:</label>
                    <div className="flex gap-md">
                      <label className="inline-flex items-center gap-xs cursor-pointer text-body-sm">
                        <input type="radio" name="format" defaultChecked className="accent-primary h-4 w-4" />
                        <span>Microsoft Excel (.xlsx)</span>
                      </label>
                      <label className="inline-flex items-center gap-xs cursor-not-allowed opacity-50 text-body-sm">
                        <input type="radio" name="format" disabled className="h-4 w-4" />
                        <span>Adobe PDF (.pdf - Sắp ra mắt)</span>
                      </label>
                    </div>
                  </div>

                  <div className="border-t border-slate-border/40 pt-lg mt-lg">
                    <button
                      onClick={handleExport}
                      disabled={exporting}
                      className="bg-primary text-on-primary text-label-md px-xl py-3 rounded-lg font-bold hover:bg-primary-hover active:scale-[0.98] transition-all flex items-center justify-center gap-sm w-full sm:w-auto"
                    >
                      <MaterialIcon name={exporting ? 'sync' : 'download'} className={exporting ? 'animate-spin' : ''} />
                      {exporting ? 'Đang thực hiện xuất file...' : 'Tải Xuống File Báo Cáo'}
                    </button>
                  </div>
                </div>

                {/* Right information side card */}
                <div className="bg-bg-soft rounded-xl p-lg border border-slate-border/40 h-fit space-y-md">
                  <h4 className="font-bold text-on-surface">Lưu ý khi xuất báo cáo:</h4>
                  <ul className="text-body-xs text-secondary space-y-sm list-disc pl-lg">
                    <li>Báo cáo được trích xuất trực tiếp từ cơ sở dữ liệu thời gian thực.</li>
                    <li>Vui lòng không tắt trình duyệt hoặc tải lại trang khi quá trình tải đang diễn ra.</li>
                    <li>Nếu gặp lỗi phân quyền, hãy chắc chắn tài khoản của bạn đang có vai trò <strong>Quản lý (Manager)</strong> trong hệ thống.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </AdminLayout>
  );
};

export default ManagerDashboard;

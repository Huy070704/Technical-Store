import { useEffect, useState, useMemo } from 'react';
import { AdminLayout } from '../../components/admin';
import { statisticsService, type DashboardStatistics } from '@/services/statisticsService';

const AdminRevenueManagement = () => {
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await statisticsService.getDashboardData();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu thống kê từ hệ thống.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStats();
  }, []);

  const handleExport = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      await statisticsService.exportReport();
    } catch (err) {
      console.error(err);
      alert('Không thể xuất báo cáo doanh thu. Vui lòng thử lại sau.');
    } finally {
      setExporting(false);
    }
  };

  // Abbreviated numbers helper (e.g. 2.45M or 84.5k)
  const formatAbbreviated = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value}`;
  };

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
      .map((d, i) => `${(i / (len - 1)) * 100},${100 - (d.current / maxVal) * 80}`)
      .join(' ');
    const previous = stats.revenueTrend
      .map((d, i) => `${(i / (len - 1)) * 100},${100 - (d.previous / maxVal) * 80}`)
      .join(' ');

    return { current, previous };
  }, [stats]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center rounded-xl border border-slate-border/50 bg-white shadow-sm">
          <div className="flex flex-col items-center gap-sm">
            <span className="material-symbols-outlined animate-spin text-[32px] text-primary">sync</span>
            <div className="text-secondary font-medium">Đang tải báo cáo thống kê...</div>
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
            onClick={() => void fetchStats()}
            className="mt-lg bg-primary text-white text-label-md px-lg py-sm rounded hover:bg-primary-hover font-bold transition-all"
          >
            Thử lại
          </button>
        </div>
      </AdminLayout>
    );
  }

  // Find the primary payment method for donut chart center
  const mainPayment = stats.paymentDistribution.reduce((prev, current) =>
    (prev.percentage > current.percentage) ? prev : current,
    stats.paymentDistribution[0] || { method: 'Credit Card', percentage: 65 }
  );

  return (
    <AdminLayout>
      <div className="flex w-full h-full -m-4 md:-m-8">
        <div className="flex-1 overflow-y-auto p-md space-y-md">
          {/* Header Section */}
          <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-md bg-white p-md rounded-lg shadow-sm border border-slate-border">
            <div>
              <h1 className="text-headline-xl text-on-surface font-bold">Executive Overview</h1>
              <p className="text-body-sm text-secondary">Real-time revenue stream analysis &amp; business performance intelligence.</p>
            </div>
            <div className="flex flex-wrap items-center gap-sm">
              <div className="flex items-center gap-xs border border-slate-border rounded px-sm py-1.5 bg-surface-container-lowest">
                <span className="material-symbols-outlined text-secondary text-[16px]">calendar_today</span>
                <select className="border-none bg-transparent text-label-xs p-0 focus:ring-0 cursor-pointer">
                  <option>Current Month</option>
                  <option>Q3 FY2026</option>
                  <option>Current Year</option>
                </select>
              </div>
              <div className="relative inline-block text-left">
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="bg-primary text-white text-label-xs px-md py-2 rounded font-bold hover:bg-primary-hover flex items-center gap-xs transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">{exporting ? 'sync' : 'file_download'}</span>
                  {exporting ? 'Exporting...' : 'Export Report'}
                </button>
              </div>
            </div>
          </header>

          {/* KPI Row (Dense Grid) */}
          <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-sm">
            {/* KPI 1: Gross Revenue */}
            <div className="bg-white p-sm rounded border border-slate-border shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-tighter">Gross Revenue</p>
                <div className="flex items-baseline gap-xs">
                  <h2 className="text-headline-lg font-bold text-on-surface">{formatAbbreviated(stats.grossRevenue)}</h2>
                  <span className="text-label-xs text-tertiary font-bold">+12.4%</span>
                </div>
              </div>
              <div className="sparkline bg-tertiary/10 rounded mt-xs relative overflow-hidden">
                <svg className="absolute inset-0" viewBox="0 0 60 30">
                  <polyline fill="none" points="0,25 10,20 20,22 30,15 40,18 50,5 60,10" stroke="#008438" strokeWidth="1.5"></polyline>
                </svg>
              </div>
            </div>

            {/* KPI 2: Net Profit */}
            <div className="bg-white p-sm rounded border border-slate-border shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-tighter">Net Profit</p>
                <div className="flex items-baseline gap-xs">
                  <h2 className="text-headline-lg font-bold text-on-surface">{formatAbbreviated(stats.netProfit)}</h2>
                  <span className="text-label-xs text-tertiary font-bold">+5.2%</span>
                </div>
              </div>
              <div className="sparkline bg-tertiary/10 rounded mt-xs relative overflow-hidden">
                <svg className="absolute inset-0" viewBox="0 0 60 30">
                  <polyline fill="none" points="0,20 10,25 20,15 30,22 40,10 50,12 60,5" stroke="#008438" strokeWidth="1.5"></polyline>
                </svg>
              </div>
            </div>

            {/* KPI 3: Avg Order Value */}
            <div className="bg-white p-sm rounded border border-slate-border shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-tighter">Avg Order Value</p>
                <div className="flex items-baseline gap-xs">
                  <h2 className="text-headline-lg font-bold text-on-surface">${stats.avgOrderValue.toFixed(1)}</h2>
                  <span className="text-label-xs text-error font-bold">-1.2%</span>
                </div>
              </div>
              <div className="sparkline bg-error/10 rounded mt-xs relative overflow-hidden">
                <svg className="absolute inset-0" viewBox="0 0 60 30">
                  <polyline fill="none" points="0,10 10,12 20,18 30,15 40,25 50,22 60,28" stroke="#ba1a1a" strokeWidth="1.5"></polyline>
                </svg>
              </div>
            </div>

            {/* KPI 4: Conversion Rate */}
            <div className="bg-white p-sm rounded border border-slate-border shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-tighter">Conversion Rate</p>
                <div className="flex items-baseline gap-xs">
                  <h2 className="text-headline-lg font-bold text-on-surface">{stats.conversionRate}%</h2>
                  <span className="text-label-xs text-tertiary font-bold">+0.8%</span>
                </div>
              </div>
              <div className="sparkline bg-tertiary/10 rounded mt-xs relative overflow-hidden">
                <svg className="absolute inset-0" viewBox="0 0 60 30">
                  <polyline fill="none" points="0,28 10,25 20,20 30,18 40,12 50,10 60,5" stroke="#008438" strokeWidth="1.5"></polyline>
                </svg>
              </div>
            </div>

            {/* KPI 5: Total Orders */}
            <div className="bg-white p-sm rounded border border-slate-border shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-tighter">Total Orders</p>
                <div className="flex items-baseline gap-xs">
                  <h2 className="text-headline-lg font-bold text-on-surface">{stats.totalOrders.toLocaleString()}</h2>
                  <span className="text-label-xs text-tertiary font-bold">+8.1%</span>
                </div>
              </div>
              <div className="sparkline bg-tertiary/10 rounded mt-xs relative overflow-hidden">
                <svg className="absolute inset-0" viewBox="0 0 60 30">
                  <polyline fill="none" points="0,20 15,10 30,15 45,5 60,10" stroke="#008438" strokeWidth="1.5"></polyline>
                </svg>
              </div>
            </div>

            {/* KPI 6: Return Rate */}
            <div className="bg-white p-sm rounded border border-slate-border shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-tighter">Return Rate</p>
                <div className="flex items-baseline gap-xs">
                  <h2 className="text-headline-lg font-bold text-on-surface">{stats.returnRate}%</h2>
                  <span className="text-label-xs text-tertiary font-bold">-0.5%</span>
                </div>
              </div>
              <div className="sparkline bg-tertiary/10 rounded mt-xs relative overflow-hidden">
                <svg className="absolute inset-0" viewBox="0 0 60 30">
                  <polyline fill="none" points="0,5 10,8 20,15 30,10 40,20 50,18 60,25" stroke="#008438" strokeWidth="1.5"></polyline>
                </svg>
              </div>
            </div>
          </section>

          {/* Main Analytics Grid */}
          <section className="grid grid-cols-1 lg:grid-cols-4 lg:grid-rows-2 gap-md">
            {/* Revenue Trend Multi-line Chart */}
            <div className="lg:col-span-3 bg-white p-md rounded border border-slate-border shadow-sm">
              <div className="flex justify-between items-center mb-md">
                <h3 className="text-label-md font-bold">Revenue Trend Comparison</h3>
                <div className="flex gap-md text-[10px] font-bold text-secondary">
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-error"></span> Current Month</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Previous Month</div>
                </div>
              </div>
              <div className="chart-container relative">
                <div className="absolute inset-0 grid grid-cols-6 border-b border-l border-slate-border">
                  <div className="border-r border-slate-100 h-full"></div>
                  <div className="border-r border-slate-100 h-full"></div>
                  <div className="border-r border-slate-100 h-full"></div>
                  <div className="border-r border-slate-100 h-full"></div>
                  <div className="border-r border-slate-100 h-full"></div>
                  <div className="border-r border-slate-100 h-full"></div>
                </div>
                <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  {/* Previous Month Line */}
                  <polyline fill="none" points={chartPoints.previous} stroke="#CBD5E1" strokeWidth="1"></polyline>
                  {/* Current Month Line */}
                  <polyline fill="none" points={chartPoints.current} stroke="#ba1a1a" strokeWidth="2"></polyline>
                </svg>
                <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[10px] text-secondary">
                  <span>Day 01</span><span>Day 07</span><span>Day 14</span><span>Day 21</span><span>Day 28</span><span>Day 30</span>
                </div>
              </div>
            </div>

            {/* Distribution Charts (Donut) */}
            <div className="bg-white p-md rounded border border-slate-border shadow-sm flex flex-col justify-between">
              <h3 className="text-label-md font-bold mb-md">Payment Distribution</h3>
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-32 h-32 rounded-full border-[12px] border-slate-100 relative flex items-center justify-center">
                  <div className="absolute inset-[-12px] rounded-full border-[12px] border-primary border-r-transparent border-b-transparent rotate-[45deg]"></div>
                  <div className="text-center">
                    <span className="block text-headline-lg font-bold">{mainPayment.percentage}%</span>
                    <span className="text-[10px] text-secondary">{mainPayment.method}</span>
                  </div>
                </div>
                <div className="mt-md w-full space-y-xs">
                  {stats.paymentDistribution.map((p) => (
                    <div key={p.method}>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-secondary">{p.method}</span>
                        <span className="font-bold">{p.percentage}%</span>
                      </div>
                      <div className="w-full h-1 bg-slate-100 rounded-full">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${p.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Orders vs Revenue Dual Axis */}
            <div className="lg:col-span-2 bg-white p-md rounded border border-slate-border shadow-sm">
              <h3 className="text-label-md font-bold mb-md">Orders vs Revenue Velocity</h3>
              <div className="chart-container flex items-end justify-between gap-sm">
                <div className="flex-1 flex flex-col gap-1 items-center">
                  <div className="w-full h-24 bg-primary-container/20 rounded-t relative"><div className="absolute bottom-0 w-full h-[60%] bg-primary/40 rounded-t"></div></div>
                  <span className="text-[9px] text-secondary">Mon</span>
                </div>
                <div className="flex-1 flex flex-col gap-1 items-center">
                  <div className="w-full h-28 bg-primary-container/20 rounded-t relative"><div className="absolute bottom-0 w-full h-[70%] bg-primary/40 rounded-t"></div></div>
                  <span className="text-[9px] text-secondary">Tue</span>
                </div>
                <div className="flex-1 flex flex-col gap-1 items-center">
                  <div className="w-full h-20 bg-primary-container/20 rounded-t relative"><div className="absolute bottom-0 w-full h-[50%] bg-primary/40 rounded-t"></div></div>
                  <span className="text-[9px] text-secondary">Wed</span>
                </div>
                <div className="flex-1 flex flex-col gap-1 items-center">
                  <div className="w-full h-32 bg-primary-container/20 rounded-t relative"><div className="absolute bottom-0 w-full h-[80%] bg-primary/40 rounded-t"></div></div>
                  <span className="text-[9px] text-secondary">Thu</span>
                </div>
                <div className="flex-1 flex flex-col gap-1 items-center">
                  <div className="w-full h-40 bg-primary-container/20 rounded-t relative"><div className="absolute bottom-0 w-full h-[95%] bg-primary/40 rounded-t"></div></div>
                  <span className="text-[9px] text-secondary">Fri</span>
                </div>
                <div className="flex-1 flex flex-col gap-1 items-center">
                  <div className="w-full h-24 bg-primary-container/20 rounded-t relative"><div className="absolute bottom-0 w-full h-[65%] bg-primary/40 rounded-t"></div></div>
                  <span className="text-[9px] text-secondary">Sat</span>
                </div>
              </div>
            </div>

            {/* Revenue Forecasting */}
            <div className="bg-white p-md rounded border border-slate-border shadow-sm">
              <h3 className="text-label-md font-bold mb-md">Revenue Forecasting</h3>
              <div className="space-y-sm">
                <div className="p-sm bg-surface-container-low rounded border border-slate-border/50">
                  <p className="text-[10px] text-secondary font-bold uppercase">Estimated Month End</p>
                  <p className="text-headline-lg font-bold text-primary">$3.1M</p>
                  <p className="text-[10px] text-tertiary">104.5% of Monthly Target</p>
                </div>
                <div className="space-y-xs">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span>Q4 Target Progress</span>
                    <span>$9.2M / $12.0M</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[76%]"></div>
                  </div>
                  <p className="text-[10px] text-secondary">Projected to hit goal by Dec 18.</p>
                </div>
              </div>
            </div>

            {/* Peak Transaction Hours */}
            <div className="bg-white p-md rounded border border-slate-border shadow-sm">
              <h3 className="text-label-md font-bold mb-md">Peak Transaction Hours</h3>
              <div className="grid grid-cols-7 gap-1">
                <div className="heatmap-cell bg-slate-50 rounded"></div>
                <div className="heatmap-cell bg-primary/10 rounded"></div>
                <div className="heatmap-cell bg-primary/30 rounded"></div>
                <div className="heatmap-cell bg-primary/60 rounded"></div>
                <div className="heatmap-cell bg-primary/40 rounded"></div>
                <div className="heatmap-cell bg-primary/20 rounded"></div>
                <div className="heatmap-cell bg-slate-50 rounded"></div>
                <div className="heatmap-cell bg-slate-50 rounded"></div>
                <div className="heatmap-cell bg-primary/20 rounded"></div>
                <div className="heatmap-cell bg-primary/50 rounded"></div>
                <div className="heatmap-cell bg-primary/90 rounded"></div>
                <div className="heatmap-cell bg-primary/70 rounded"></div>
                <div className="heatmap-cell bg-primary/30 rounded"></div>
                <div className="heatmap-cell bg-slate-50 rounded"></div>
                <div className="heatmap-cell bg-slate-50 rounded"></div>
                <div className="heatmap-cell bg-primary/10 rounded"></div>
                <div className="heatmap-cell bg-primary/40 rounded"></div>
                <div className="heatmap-cell bg-primary/80 rounded"></div>
                <div className="heatmap-cell bg-primary/50 rounded"></div>
                <div className="heatmap-cell bg-primary/20 rounded"></div>
                <div className="heatmap-cell bg-slate-50 rounded"></div>
              </div>
              <div className="mt-md flex justify-between text-[9px] text-secondary uppercase font-bold">
                <span>00:00</span><span>12:00</span><span>23:59</span>
              </div>
            </div>
          </section>

          {/* Data Tables Section */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-md">
            {/* Top Performing Products */}
            <div className="bg-white rounded border border-slate-border shadow-sm overflow-hidden">
              <div className="px-md py-sm border-b border-slate-border flex items-center justify-between">
                <h3 className="text-label-md font-bold">Top Performing Products</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-secondary uppercase">
                    <tr>
                      <th className="px-md py-2">Product</th>
                      <th className="px-md py-2">Revenue</th>
                      <th className="px-md py-2">Growth</th>
                      <th className="px-md py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[12px]">
                    {stats.topProducts.map((p) => (
                      <tr key={p.name} className="hover:bg-slate-50">
                        <td className="px-md py-2 flex items-center gap-sm">
                          <div className="w-8 h-8 bg-slate-100 rounded border border-slate-200 shrink-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-secondary text-[16px]">inventory_2</span>
                          </div>
                          <span className="font-bold truncate max-w-[120px]">{p.name}</span>
                        </td>
                        <td className="px-md py-2 font-bold">${p.revenue.toLocaleString()}</td>
                        <td className="px-md py-2 text-tertiary font-bold">{p.growth}</td>
                        <td className="px-md py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.status === 'In Stock' ? 'bg-tertiary/10 text-tertiary' : 'bg-warning/10 text-warning'
                          }`}>{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent High-Value Transactions */}
            <div className="bg-white rounded border border-slate-border shadow-sm overflow-hidden">
              <div className="px-md py-sm border-b border-slate-border flex items-center justify-between">
                <h3 className="text-label-md font-bold">High-Value Transactions</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-secondary uppercase">
                    <tr>
                      <th className="px-md py-2">ID</th>
                      <th className="px-md py-2">Entity</th>
                      <th className="px-md py-2">Status</th>
                      <th className="px-md py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[12px]">
                    {stats.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50">
                        <td className="px-md py-2 font-bold text-secondary">{tx.id}</td>
                        <td className="px-md py-2 truncate max-w-[120px]">{tx.entity}</td>
                        <td className="px-md py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.status === 'Settled' ? 'bg-tertiary/10 text-tertiary' : 'bg-surface-container-high text-on-surface-variant'
                          }`}>{tx.status}</span>
                        </td>
                        <td className="px-md py-2 text-right font-bold">${tx.amount.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* Right Side Drawer */}
        <aside className="w-72 border-l border-slate-border bg-white p-md overflow-y-auto hidden xl:block shrink-0">
          <h3 className="text-label-md font-bold mb-md flex items-center gap-sm">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            Live Business Feed
          </h3>
          <div className="space-y-md">
            {/* Quick Counter */}
            <div className="p-md bg-inverse-surface text-on-primary rounded shadow-inner text-center">
              <p className="text-[10px] opacity-60 uppercase font-bold tracking-widest mb-1">Today's Order Count</p>
              <p className="text-[32px] font-bold leading-none">{stats.totalOrders.toLocaleString()}</p>
              <p className="text-[10px] text-tertiary-fixed font-bold mt-1">▲ 14% vs avg</p>
            </div>
            {/* Inventory Alerts */}
            <div className="space-y-sm">
              <p className="text-[11px] font-bold text-secondary uppercase">Critical Alerts</p>
              <div className="flex items-start gap-sm p-sm bg-error-container/20 rounded border border-error/10">
                <span className="material-symbols-outlined text-error text-[18px]">warning</span>
                <div>
                  <p className="text-[12px] font-bold text-on-error-container">Out of Stock</p>
                  <p className="text-[10px] text-secondary">Currently {stats.outOfStockItems} items are out of stock.</p>
                </div>
              </div>
              <div className="flex items-start gap-sm p-sm bg-warning/10 rounded border border-warning/10">
                <span className="material-symbols-outlined text-warning text-[18px]">bolt</span>
                <div>
                  <p className="text-[12px] font-bold text-on-surface">Low Stock Items</p>
                  <p className="text-[10px] text-secondary">There are {stats.lowStockItems} items running low on stock.</p>
                </div>
              </div>
            </div>
            {/* Revenue Goal Bars */}
            <div className="space-y-md pt-md border-t border-slate-border">
              <p className="text-[11px] font-bold text-secondary uppercase">Regional Performance</p>
              <div className="space-y-sm">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span>North HQ</span>
                    <span className="font-bold">92%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[92%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span>E-Commerce Hub</span>
                    <span className="font-bold">78%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[78%]"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span>Central Hub</span>
                    <span className="font-bold">104%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-tertiary w-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
};

export default AdminRevenueManagement;

import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { AdminLayout, PageHeader, MetricCard } from '../../components/admin';
import MaterialIcon from '../../components/admin/shared/MaterialIcon';
import { ds } from '@/styles/designSystem';
import {
  statisticsService,
  type AdminDashboardData,
} from '@/services/statisticsService';
import type { ProductMetric } from '../../components/admin/types/admin';

// ─── Types ────────────────────────────────────────────────────────────────────
type TimeRange = 'today' | '7days' | '30days';

// ─── Constants ────────────────────────────────────────────────────────────────
const TIME_OPTS: { value: TimeRange; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7days', label: '7 ngày qua' },
  { value: '30days', label: '30 ngày qua' },
];

const ORDER_COLORS = {
  'Chờ xử lý': '#f59e0b',  // warning/amber
  'Đang giao': '#3b82f6',  // info/blue
  'Đã giao': '#1a6e3c',   // success/green
  'Đã hủy': '#ba1a1a',     // error/red
  'Trả hàng': '#6b7280',    // gray
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);

const fmtShort = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B ₫`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ₫`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K ₫`;
  return fmtVND(v);
};

// ─── Custom Tooltip for Area Chart ───────────────────────────────────────────
const TrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-border bg-bg-card px-md py-sm shadow-elevated text-body-sm">
      <p className="font-semibold text-on-surface mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="text-label-xs">
          Doanh thu: {fmtVND(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Custom Tooltip for Bar Chart ───────────────────────────────────────────
const BarTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-border bg-bg-card px-md py-sm shadow-elevated text-body-sm">
      <p className="font-semibold text-on-surface mb-1">{data.status}</p>
      <p className="text-label-xs text-secondary">
        Số lượng: <span className="font-semibold text-on-surface">{data.count.toLocaleString('vi-VN')} đơn</span>
      </p>
    </div>
  );
};

const AdminDashboard = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<TimeRange>('30days');

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await statisticsService.getAdminDashboardData({ timeRange });
      setData(result);
    } catch (e) {
      console.error(e);
      setError('Không thể tải dữ liệu thống kê Dashboard. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => { void fetch(); }, [fetch]);

  // ── KPI metrics mappings ──
  const kpiMetrics: ProductMetric[] = data
    ? [
        {
          label: 'Doanh thu thuần',
          value: fmtShort(data.kpis.revenue.total),
          icon: 'trending_up',
          tone: 'primary',
          meta: data.kpis.revenue.growthPercentage >= 0
            ? `+${data.kpis.revenue.growthPercentage.toFixed(1)}%`
            : `${data.kpis.revenue.growthPercentage.toFixed(1)}%`,
          metaTone: data.kpis.revenue.growthPercentage >= 0 ? 'success' : 'danger',
        },
        {
          label: 'Đơn Hàng Mới',
          value: data.kpis.orders.totalNew.toLocaleString('vi-VN'),
          icon: 'shopping_bag',
          tone: 'secondary',
          meta: `${data.kpis.orders.pending} chờ · ${data.kpis.orders.completed} xong`,
          metaTone: 'neutral',
        },
        {
          label: 'Khách Hàng Mới',
          value: data.kpis.newCustomers.toLocaleString('vi-VN'),
          icon: 'group',
          tone: 'success',
          meta: 'Đăng ký mới',
          metaTone: 'success',
        },
        {
          label: 'Tồn Kho Cảnh Báo',
          value: data.kpis.lowStockProductsCount.toLocaleString('vi-VN'),
          icon: 'warning',
          tone: 'neutral',
          meta: 'Dưới mức tối thiểu',
          metaTone: data.kpis.lowStockProductsCount > 0 ? 'danger' : 'neutral',
        },
      ]
    : [];

  const lowStockProductsCount = data?.kpis.lowStockProductsCount ?? 0;

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          title="Bảng điều khiển Admin"
          description="Theo dõi toàn bộ hoạt động kinh doanh, doanh thu, đơn hàng, khách hàng và hàng tồn kho."
        />

        {/* ── Filter Toolbar ── */}
        <div className={`${ds.card.base} ${ds.card.paddingMd} flex items-center justify-between`}>
          <div className="flex items-center gap-xs rounded-lg border border-slate-border/50 bg-slate-50 p-1">
            {TIME_OPTS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeRange(opt.value)}
                className={`rounded-md px-md py-1.5 text-body-sm font-medium transition-all duration-200 ${
                  timeRange === opt.value
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-secondary hover:bg-slate-100 hover:text-on-surface'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Content View ── */}
        {loading ? (
          <div className="flex h-96 items-center justify-center rounded-xl border border-slate-border bg-bg-card shadow-sm animate-pulse">
            <div className="flex flex-col items-center gap-sm">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span>
              <div className="text-secondary font-semibold">Đang tải dữ liệu báo cáo...</div>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-error/20 bg-error-container/20 p-xl text-center">
            <span className="material-symbols-outlined text-[48px] text-error">warning</span>
            <p className="mt-md text-error font-medium">{error}</p>
            <button
              onClick={() => void fetch()}
              className="mt-lg bg-primary text-white text-label-md px-lg py-sm rounded hover:bg-primary-hover font-bold transition-all"
            >
              Thử lại
            </button>
          </div>
        ) : !data ? (
          <div className="flex h-96 items-center justify-center rounded-xl border border-slate-border bg-bg-card shadow-sm">
            <div className="text-secondary font-semibold">Không có dữ liệu báo cáo.</div>
          </div>
        ) : (
          <div className="space-y-lg animate-fade-in">
            {/* ── KPI Summary Cards ── */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
              {kpiMetrics.map((m) => (
                <MetricCard key={m.label} metric={m} />
              ))}
            </section>

            {/* ── Main Charts Grid ── */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
              {/* Revenue Trend Area Chart */}
              <div className={`${ds.card.base} ${ds.card.paddingMd} lg:col-span-2 flex flex-col justify-between`}>
                <div>
                  <h2 className="text-label-md font-bold text-on-surface mb-1">Xu hướng Doanh thu</h2>
                  <p className="text-label-xs text-secondary mb-md">Doanh thu thuần từ các đơn hàng đã hoàn thành và thanh toán thành công</p>
                </div>
                {data.revenueTrend.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-secondary text-body-sm">
                    Không có dữ liệu
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.revenueTrend} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1a6e3c" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#1a6e3c" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="label"
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => fmtShort(v)}
                        />
                        <Tooltip content={<TrendTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="Doanh thu"
                          stroke="#1a6e3c"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#gradRevenue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Order Status Distribution Bar Chart */}
              <div className={`${ds.card.base} ${ds.card.paddingMd} flex flex-col justify-between`}>
                <div>
                  <h2 className="text-label-md font-bold text-on-surface mb-1">Phân bổ Trạng thái Đơn hàng</h2>
                  <p className="text-label-xs text-secondary mb-md">Số lượng đơn hàng được đặt theo trạng thái</p>
                </div>
                {data.orderStatusDistribution.every(d => d.count === 0) ? (
                  <div className="flex h-64 items-center justify-center text-secondary text-body-sm">
                    Không có dữ liệu
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.orderStatusDistribution} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="status"
                          stroke="#94a3b8"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip content={<BarTooltip />} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          {data.orderStatusDistribution.map((entry, index) => {
                            const color = ORDER_COLORS[entry.status as keyof typeof ORDER_COLORS] || '#94a3b8';
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </section>

            {/* ── Detailed Analytics Grid ── */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
              {/* Branch Revenue Ranking Table */}
              <div className={`${ds.card.base} lg:col-span-1 flex flex-col justify-between overflow-hidden`}>
                <div className="p-lg border-b border-slate-border/40">
                  <h2 className="text-label-md font-bold text-on-surface">Doanh thu theo Chi nhánh</h2>
                  <p className="text-label-xs text-secondary mt-0.5">Xếp hạng chi nhánh theo tổng doanh thu</p>
                </div>
                {data.branchRevenue.length === 0 ? (
                  <div className="flex h-72 items-center justify-center text-secondary text-body-sm">
                    Không có dữ liệu
                  </div>
                ) : (
                  <div className="overflow-y-auto max-h-[300px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-label-xs text-secondary uppercase sticky top-0">
                        <tr className="border-b border-slate-border/40">
                          <th className="py-3 px-lg">Chi nhánh</th>
                          <th className="py-3 px-lg text-right">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-border/20">
                        {data.branchRevenue.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-lg text-body-sm font-medium text-on-surface">
                              {item.branchName}
                            </td>
                            <td className="py-3 px-lg text-right text-body-sm font-semibold text-primary">
                              {fmtVND(item.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="p-md bg-bg-soft/40 border-t border-slate-border/40 text-right text-label-xs text-secondary font-bold">
                  Tổng: {fmtVND(data.branchRevenue.reduce((sum, item) => sum + item.revenue, 0))}
                </div>
              </div>

              {/* Top 5 Best Selling Products */}
              <div className={`${ds.card.base} lg:col-span-2 flex flex-col justify-between overflow-hidden`}>
                <div className="p-lg border-b border-slate-border/40">
                  <h2 className="text-label-md font-bold text-on-surface">Top 5 Sản phẩm Bán chạy</h2>
                  <p className="text-label-xs text-secondary mt-0.5">Sản phẩm có doanh số và sản lượng cao nhất</p>
                </div>
                {data.topBestSellingProducts.length === 0 ? (
                  <div className="flex h-72 items-center justify-center text-secondary text-body-sm">
                    Không có dữ liệu
                  </div>
                ) : (
                  <div className="overflow-y-auto max-h-[300px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-label-xs text-secondary uppercase sticky top-0">
                        <tr className="border-b border-slate-border/40">
                          <th className="py-3 pl-lg pr-4">#</th>
                          <th className="py-3 px-4">Tên sản phẩm</th>
                          <th className="py-3 px-4 text-right">Số lượng bán</th>
                          <th className="py-3 pl-4 pr-lg text-right">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-border/20">
                        {data.topBestSellingProducts.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 pl-lg pr-4 text-body-sm text-secondary font-medium">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 text-body-sm font-medium text-on-surface max-w-[240px] truncate" title={p.productName}>
                              {p.productName}
                            </td>
                            <td className="py-3 px-4 text-right text-body-sm text-secondary">
                              {p.quantitySold.toLocaleString('vi-VN')}
                            </td>
                            <td className="py-3 pl-4 pr-lg text-right text-body-sm font-semibold text-primary">
                              {fmtVND(p.totalRevenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="p-md bg-bg-soft/40 border-t border-slate-border/40 text-label-xs text-secondary italic">
                  * Tổng hợp dựa trên dữ liệu đơn hàng giao dịch thành công.
                </div>
              </div>
            </section>

            {/* ── Low Stock Warnings List Table ── */}
            <section className={`${ds.card.base} flex flex-col overflow-hidden`}>
              <div className="p-lg border-b border-slate-border/40 flex items-center justify-between">
                <div>
                  <h2 className="text-label-md font-bold text-on-surface flex items-center gap-xs">
                    <MaterialIcon name="warning" className="text-warning text-[20px]" /> Danh sách Cảnh báo Tồn kho Thấp
                  </h2>
                  <p className="text-label-xs text-secondary mt-0.5">Sản phẩm có tổng số lượng tồn kho thấp hơn ngưỡng tối thiểu</p>
                </div>
                {lowStockProductsCount > 0 && (
                  <span className={`${ds.badge.error} animate-pulse`}>
                    Có {lowStockProductsCount} sản phẩm
                  </span>
                )}
              </div>
              {data.lowStockWarningList.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-secondary text-body-sm">
                  Không có sản phẩm nào ở mức tồn kho thấp.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-label-xs text-secondary uppercase">
                      <tr className="border-b border-slate-border/40">
                        <th className="py-3 px-lg">Mã SKU</th>
                        <th className="py-3 px-lg">Tên sản phẩm</th>
                        <th className="py-3 px-lg text-right">Tồn kho hiện tại</th>
                        <th className="py-3 px-lg text-right">Ngưỡng tối thiểu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border/20">
                      {data.lowStockWarningList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-lg text-body-sm font-mono text-secondary">
                            {item.productCode}
                          </td>
                          <td className="py-3 px-lg text-body-sm font-medium text-on-surface">
                            {item.productName}
                          </td>
                          <td className="py-3 px-lg text-right text-body-sm font-semibold text-error">
                            {item.currentStock.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-3 px-lg text-right text-body-sm text-secondary">
                            {item.minimumStockThreshold.toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;

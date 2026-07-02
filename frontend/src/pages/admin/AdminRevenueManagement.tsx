import { useEffect, useState, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { AdminLayout, PageHeader, MetricCard } from '../../components/admin';
import MaterialIcon from '../../components/admin/shared/MaterialIcon';
import { ds } from '@/styles/designSystem';
import {
  statisticsService,
  type RevenueStatistics,
  type RevenueQuery,
} from '@/services/statisticsService';
import type { ProductMetric } from '../../components/admin/types/admin';

// ─── Types ────────────────────────────────────────────────────────────────────
type TimeRange = 'today' | '7days' | '30days' | 'custom';
type Channel = 'all' | 'online' | 'pos';

// ─── Constants ────────────────────────────────────────────────────────────────
const TIME_OPTS: { value: TimeRange; label: string }[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: '7days', label: '7 ngày qua' },
  { value: '30days', label: '30 ngày qua' },
  { value: 'custom', label: 'Tùy chọn' },
];

const CHANNEL_OPTS: { value: Channel; label: string }[] = [
  { value: 'all', label: 'Tất cả kênh' },
  { value: 'online', label: 'Online (Website)' },
  { value: 'pos', label: 'POS (Tại quầy)' },
];

const PIE_COLORS = ['#1a6e3c', '#f59e0b', '#3b82f6'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);

const fmtShort = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B ₫`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ₫`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K ₫`;
  return fmtVND(v);
};

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const getPaymentColor = (method: string) => {
  if (method === 'Tiền mặt') return '#1a6e3c';
  if (method === 'COD') return '#3b82f6';
  return '#f59e0b';
};

// ─── Custom Tooltip for Area Chart ───────────────────────────────────────────
const TrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-border bg-bg-card px-md py-sm shadow-elevated text-body-sm">
      <p className="font-semibold text-on-surface mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="text-label-xs">
          {p.name}: {fmtShort(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Custom Tooltip for Pie ───────────────────────────────────────────────────
const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-border bg-bg-card px-md py-sm shadow-elevated text-body-sm">
      <p className="font-semibold text-on-surface">{d.method}</p>
      <p className="text-label-xs text-secondary">{fmtVND(d.revenue)}</p>
      <p className="text-label-xs text-secondary">{d.percentage}% · {d.count} đơn</p>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const AdminRevenueManagement = () => {
  const [data, setData] = useState<RevenueStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [timeRange, setTimeRange] = useState<TimeRange>('30days');
  const [channel, setChannel] = useState<Channel>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination for transaction history
  const [txPage, setTxPage] = useState(1);
  const TX_PER_PAGE = 10;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query: RevenueQuery = { channel, timeRange };
      if (timeRange === 'custom' && startDate && endDate) {
        query.startDate = startDate;
        query.endDate = endDate;
      }
      const result = await statisticsService.getRevenueData(query);
      setData(result);
      setTxPage(1);
    } catch (e) {
      console.error(e);
      setError('Không thể tải dữ liệu doanh thu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [channel, timeRange, startDate, endDate]);

  useEffect(() => { void fetch(); }, [fetch]);

  // ── KPI metrics ──
  const kpiMetrics: ProductMetric[] = data
    ? [
        {
          label: 'Doanh thu gộp',
          value: fmtShort(data.kpis.grossRevenue),
          icon: 'payments',
          tone: 'primary',
          meta: 'Tất cả đơn hàng',
          metaTone: 'neutral',
        },
        {
          label: 'Doanh thu thuần',
          value: fmtShort(data.kpis.netRevenue),
          icon: 'trending_up',
          tone: 'success',
          meta: 'Trừ hủy & hoàn trả',
          metaTone: 'neutral',
        },
        {
          label: 'Đơn thành công',
          value: data.kpis.successfulOrderCount.toLocaleString('vi-VN'),
          icon: 'check_circle',
          tone: 'secondary',
          meta: 'Đã giao hàng và thành công',
          metaTone: 'neutral',
        },
        {
          label: 'Giá trị đơn TB (AOV)',
          value: fmtShort(data.kpis.avgOrderValue),
          icon: 'avg_pace',
          tone: 'neutral',
          meta: 'Doanh thu / Đơn thành công',
          metaTone: 'neutral',
        },
      ]
    : [];

  // ── Pagination ──
  const txRows = data?.transactionHistory ?? [];
  const txTotal = txRows.length;
  const txPages = Math.ceil(txTotal / TX_PER_PAGE) || 1;
  const txSlice = txRows.slice((txPage - 1) * TX_PER_PAGE, txPage * TX_PER_PAGE);

  // ── Render ──
  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          title="Quản lý Doanh thu"
          description="Phân tích doanh thu theo kênh bán hàng và khoảng thời gian từ dữ liệu thực tế."
        />

        {/* ── Filters ── */}
        <div className={`${ds.card.base} ${ds.card.paddingMd} space-y-md`}>
          <div className="flex flex-col gap-md lg:flex-row lg:items-center lg:justify-between">
            {/* Time Range Tabs */}
            <div className="flex items-center gap-xs rounded-lg border border-slate-border/50 bg-slate-50 p-1">
              {TIME_OPTS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setTimeRange(opt.value); if (opt.value !== 'custom') { setStartDate(''); setEndDate(''); } }}
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

            {/* Channel */}
            <div className="flex items-center gap-sm">
              <label className="shrink-0 text-body-sm font-semibold text-secondary">Kênh bán:</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as Channel)}
                className="min-w-[180px] cursor-pointer rounded-lg border border-slate-border/50 bg-slate-50 px-md py-sm text-body-sm text-on-surface outline-none transition-all hover:bg-slate-100 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
              >
                {CHANNEL_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Custom date range */}
          {timeRange === 'custom' && (
            <div className="flex flex-wrap items-center gap-md border-t border-slate-border/30 pt-md">
              <MaterialIcon name="date_range" className="text-secondary" />
              <label className="shrink-0 text-body-sm font-semibold text-secondary">Từ ngày:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="cursor-pointer rounded-lg border border-slate-border/50 bg-slate-50 px-md py-sm text-body-sm text-on-surface outline-none transition-all hover:bg-slate-100 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
              <label className="shrink-0 text-body-sm font-semibold text-secondary">Đến ngày:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="cursor-pointer rounded-lg border border-slate-border/50 bg-slate-50 px-md py-sm text-body-sm text-on-surface outline-none transition-all hover:bg-slate-100 focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
              />
              {startDate && endDate && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="flex items-center gap-xs text-body-sm text-secondary transition-colors hover:text-error"
                >
                  <MaterialIcon name="close" className="text-[16px]" />
                  <span>Xóa</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Loading / Error ── */}
        {error && (
          <div className="flex flex-col items-center gap-sm rounded-xl border border-error/20 bg-error-container/20 py-xl text-center">
            <MaterialIcon name="warning" className="text-[40px] text-error" />
            <p className="text-body-sm text-error font-medium">{error}</p>
            <button onClick={() => void fetch()} className={`${ds.btn.primary} mt-sm`}>Thử lại</button>
          </div>
        )}

        {loading && (
          <div className="flex h-64 items-center justify-center rounded-xl border border-slate-border/30 bg-bg-card">
            <div className="flex flex-col items-center gap-sm">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span>
              <p className="text-body-sm text-secondary font-medium">Đang tải dữ liệu doanh thu...</p>
            </div>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* ── KPI Cards ── */}
            <section className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-4">
              {kpiMetrics.map((m) => <MetricCard key={m.label} metric={m} />)}
            </section>

            {/* ── Revenue Trend Chart ── */}
            <div className={`${ds.card.base} ${ds.card.paddingMd}`}>
              <div className="mb-md flex items-center justify-between">
                <div>
                  <h2 className="text-label-md font-bold text-on-surface">Xu hướng Doanh thu</h2>
                  <p className="text-label-xs text-secondary mt-0.5">So sánh doanh thu POS và Online theo thời gian</p>
                </div>
                <div className="flex items-center gap-md text-label-xs text-secondary">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-primary" />POS</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded bg-[#f59e0b]" />Online</span>
                </div>
              </div>

              {data.revenueTrend.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-secondary text-body-sm">
                  Không có dữ liệu trong khoảng thời gian này
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={data.revenueTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1a6e3c" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#1a6e3c" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradOnline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      interval="preserveStartEnd"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => fmtShort(v)}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={false}
                      width={80}
                    />
                    <Tooltip content={<TrendTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="pos"
                      name="POS"
                      stroke="#1a6e3c"
                      strokeWidth={2}
                      fill="url(#gradPos)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#1a6e3c' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="online"
                      name="Online"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fill="url(#gradOnline)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#f59e0b' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* ── Revenue Analysis: Top Products + Payment Pie ── */}
            <section className="grid grid-cols-1 gap-lg lg:grid-cols-3">
              {/* Top 5 Products */}
              <div className={`${ds.card.base} overflow-hidden lg:col-span-2`}>
                <div className="border-b border-slate-border px-lg py-md">
                  <h2 className="text-label-md font-bold text-on-surface">Top 5 Sản phẩm theo Doanh thu</h2>
                  <p className="text-label-xs text-secondary mt-0.5">Xếp hạng dựa trên tổng doanh thu thực tế</p>
                </div>
                {data.topProducts.length === 0 ? (
                  <div className="flex h-48 items-center justify-center text-secondary text-body-sm">
                    Không có dữ liệu sản phẩm
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-label-xs text-secondary uppercase">
                        <tr className="border-b border-slate-border/40">
                          <th className="py-3 pl-lg pr-4">#</th>
                          <th className="py-3 px-4">Tên sản phẩm</th>
                          <th className="py-3 px-4 text-right">SL bán</th>
                          <th className="py-3 pl-4 pr-lg text-right">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-border/30">
                        {data.topProducts.map((p) => (
                          <tr key={p.rank} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 pl-lg pr-4">
                              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-label-xs font-bold ${
                                p.rank === 1 ? 'bg-amber-100 text-amber-700' :
                                p.rank === 2 ? 'bg-slate-100 text-slate-600' :
                                p.rank === 3 ? 'bg-orange-50 text-orange-600' :
                                'bg-slate-50 text-secondary'
                              }`}>{p.rank}</span>
                            </td>
                            <td className="py-3 px-4 max-w-[200px]">
                              <p className="text-body-sm text-on-surface font-medium truncate" title={p.name}>{p.name}</p>
                            </td>
                            <td className="py-3 px-4 text-right text-body-sm text-secondary">
                              {p.quantitySold.toLocaleString('vi-VN')}
                            </td>
                            <td className="py-3 pl-4 pr-lg text-right">
                              <span className="text-body-sm font-semibold text-primary">{fmtVND(p.totalRevenue)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Payment Method Pie */}
              <div className={`${ds.card.base} ${ds.card.paddingMd} flex flex-col`}>
                <h2 className="text-label-md font-bold text-on-surface mb-1">Phân bổ Thanh toán</h2>
                <p className="text-label-xs text-secondary mb-md">Theo phương thức thanh toán</p>

                {data.paymentDistribution.every(d => d.revenue === 0) ? (
                  <div className="flex flex-1 items-center justify-center text-secondary text-body-sm">
                    Không có dữ liệu
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={data.paymentDistribution}
                          dataKey="revenue"
                          nameKey="method"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {data.paymentDistribution.map((entry) => (
                            <Cell key={entry.method} fill={getPaymentColor(entry.method)} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          formatter={(v) => <span className="text-label-xs text-secondary">{v}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="mt-md space-y-sm">
                      {data.paymentDistribution.map((d) => (
                        <div key={d.method}>
                          <div className="flex justify-between text-label-xs mb-1">
                            <span className="flex items-center gap-xs">
                              <span className="h-2 w-2 rounded-full inline-block" style={{ background: getPaymentColor(d.method) }} />
                              <span className="text-secondary">{d.method}</span>
                            </span>
                            <span className="font-semibold text-on-surface">{d.percentage}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${d.percentage}%`, background: getPaymentColor(d.method) }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* ── Transaction History ── */}
            <div className={`${ds.card.base} overflow-hidden`}>
              <div className="border-b border-slate-border px-lg py-md flex items-center justify-between">
                <div>
                  <h2 className="text-label-md font-bold text-on-surface">Lịch sử Giao dịch</h2>
                  <p className="text-label-xs text-secondary mt-0.5">
                    Các giao dịch hoàn thành — {txTotal.toLocaleString('vi-VN')} bản ghi
                  </p>
                </div>
              </div>

              {txRows.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-sm text-secondary">
                  <MaterialIcon name="receipt_long" className="text-[40px] opacity-40" />
                  <p className="text-body-sm">Không có giao dịch trong khoảng thời gian này</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-label-xs text-secondary uppercase">
                        <tr className="border-b border-slate-border/40">
                          <th className="py-3 pl-lg pr-4">Ngày GD</th>
                          <th className="py-3 px-4">Mã đơn</th>
                          <th className="py-3 px-4">Kênh bán</th>
                          <th className="py-3 px-4">Thanh toán</th>
                          <th className="py-3 px-4 text-right">Số tiền</th>
                          <th className="py-3 pl-4 pr-lg">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-border/30">
                        {txSlice.map((tx, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 pl-lg pr-4 text-body-sm text-secondary whitespace-nowrap">
                              {fmtDate(tx.transactionDate)}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-body-sm font-semibold text-on-surface">{tx.orderCode}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`${tx.salesChannel === 'Online' ? ds.badge.success : ds.badge.warning}`}>
                                {tx.salesChannel === 'Online' ? 'Online' : 'POS'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-body-sm text-on-surface">{tx.paymentMethod}</td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-body-sm font-semibold text-primary">{fmtVND(tx.amount)}</span>
                            </td>
                            <td className="py-3 pl-4 pr-lg">
                              <span className={ds.badge.success}>{tx.paymentStatus}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {txPages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-border/50 bg-surface-container-low px-lg py-md">
                      <span className="text-body-sm text-secondary">
                        {(txPage - 1) * TX_PER_PAGE + 1}–{Math.min(txPage * TX_PER_PAGE, txTotal)} / {txTotal}
                      </span>
                      <div className="flex items-center gap-xs">
                        <button
                          disabled={txPage === 1}
                          onClick={() => setTxPage((p) => p - 1)}
                          className="rounded-lg p-sm text-secondary transition-colors hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <MaterialIcon name="chevron_left" />
                        </button>
                        {Array.from({ length: txPages }, (_, i) => i + 1)
                          .filter((p) => p === 1 || p === txPages || Math.abs(p - txPage) <= 1)
                          .map((page, i, arr) => {
                            const gap = i > 0 && page - arr[i - 1] > 1;
                            return (
                              <span key={page} className="flex items-center gap-xs">
                                {gap && <span className="px-xs text-secondary">…</span>}
                                <button
                                  onClick={() => setTxPage(page)}
                                  className={`h-9 min-w-9 rounded-lg px-sm text-label-md transition-colors ${
                                    page === txPage ? 'bg-primary text-on-primary font-semibold' : 'text-secondary hover:bg-bg-soft'
                                  }`}
                                >
                                  {page}
                                </button>
                              </span>
                            );
                          })}
                        <button
                          disabled={txPage === txPages}
                          onClick={() => setTxPage((p) => p + 1)}
                          className="rounded-lg p-sm text-secondary transition-colors hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <MaterialIcon name="chevron_right" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminRevenueManagement;

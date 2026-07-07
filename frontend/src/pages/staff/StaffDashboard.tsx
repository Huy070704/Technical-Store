import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { StaffLayout } from '@/components/staff';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import MetricCard from '@/components/admin/shared/MetricCard';
import { ds } from '@/styles/designSystem';
import { useAuth } from '@/contexts/AuthContext';
import { orderService } from '@/services/orderService';
import { invoiceService } from '@/services/invoiceService';
import { paymentService } from '@/services/paymentService';
import type { ProductMetric } from '@/components/admin/types';
import type { OrderListItem } from '@/types/order';
import type { StaffInvoice } from '@/services/invoiceService';
import type { StaffPayment } from '@/services/paymentService';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);

const fmtShort = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B ₫`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ₫`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K ₫`;
  return fmtVND(v);
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const normalizePaymentLabel = (method: string | null): string => {
  if (!method) return 'Khác';
  const m = method.toUpperCase();
  if (m === 'CASH') return 'Tiền mặt';
  if (m === 'COD') return 'COD';
  if (m === 'TRANSFER' || m === 'BANK_TRANSFER' || m === 'ONLINE' || m === 'PAYOS') return 'Chuyển khoản';
  return method;
};

// ─── Order status config ─────────────────────────────────────────────────────
const ORDER_STATUS_META: { key: string; label: string; color: string }[] = [
  { key: 'PENDING',          label: 'Chờ xử lý',     color: '#f59e0b' },
  { key: 'PROCESSING',       label: 'Đang xử lý',    color: '#6366f1' },
  { key: 'SHIPPING',         label: 'Đang giao',     color: '#3b82f6' },
  { key: 'DELIVERED',        label: 'Đã giao',       color: '#14b8a6' },
  { key: 'SUCCESSFUL',       label: 'Hoàn tất',      color: '#1a6e3c' },
  { key: 'DELIVERY_FAILED',  label: 'Giao thất bại', color: '#f97316' },
  { key: 'CANCELLED',        label: 'Đã hủy',        color: '#ba1a1a' },
];

const PIE_COLORS = ['#1a6e3c', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#6b7280'];

// ─── Custom tooltips ─────────────────────────────────────────────────────────
const RevenueTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-border bg-bg-card px-md py-sm shadow-elevated text-body-sm">
      <p className="mb-1 font-semibold text-on-surface">{label}</p>
      <p className="text-label-xs text-primary">Doanh thu: {fmtVND(payload[0].value)}</p>
    </div>
  );
};

const StatusTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-border bg-bg-card px-md py-sm shadow-elevated text-body-sm">
      <p className="mb-1 font-semibold text-on-surface">{d.label}</p>
      <p className="text-label-xs text-secondary">
        Số lượng: <span className="font-semibold text-on-surface">{d.count.toLocaleString('vi-VN')} đơn</span>
      </p>
    </div>
  );
};

// ─── Aggregated dashboard data ───────────────────────────────────────────────
type DashboardData = {
  orders: OrderListItem[];
  invoices: StaffInvoice[];
  payments: StaffPayment[];
};

// ─── Dashboard ───────────────────────────────────────────────────────────────
const StaffDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tên cơ sở của nhân viên lấy từ auth context (backend serialize _id -> id).
  const facilityName = useMemo(() => {
    if (user?.facility && typeof user.facility === 'object') {
      return (user.facility as { id: string; name?: string }).name ?? null;
    }
    return null;
  }, [user]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Đơn hàng của cơ sở bị giới hạn 100/trang → phân trang để lấy toàn bộ.
      const first = await orderService.getStaffOrders({ page: 1, limit: 100 });
      let orders = first.data;
      const totalPages = Math.min(Math.ceil((first.total || 0) / 100), 20);
      if (totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            orderService.getStaffOrders({ page: i + 2, limit: 100 }),
          ),
        );
        orders = orders.concat(...rest.map((r) => r.data));
      }

      const [invoices, payments] = await Promise.all([
        invoiceService.getAll(),
        paymentService.getAll(),
      ]);

      setData({ orders, invoices, payments });
    } catch (e) {
      console.error(e);
      setError('Không thể tải dữ liệu bảng điều khiển. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // ── Derived metrics & chart data ──
  const derived = useMemo(() => {
    if (!data) return null;
    const { orders, invoices, payments } = data;
    const now = new Date();

    const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;
    const shippingOrders = orders.filter((o) => o.status === 'SHIPPING').length;
    const openInvoices = invoices.filter((i) => i.status === 'UNPAID').length;
    const pendingPayments = payments.filter((p) => p.status === 'PENDING').length;

    // Doanh thu hôm nay: hóa đơn đã thanh toán trong ngày.
    const paidInvoices = invoices.filter((i) => i.status === 'PAID');
    const revenueToday = paidInvoices
      .filter((i) => i.paidAt && isSameDay(new Date(i.paidAt), now))
      .reduce((s, i) => s + Number(i.totalAmount || 0), 0);

    // Order status distribution (chỉ giữ trạng thái có dữ liệu).
    const statusCount = new Map<string, number>();
    for (const o of orders) statusCount.set(o.status, (statusCount.get(o.status) ?? 0) + 1);
    const orderStatusDistribution = ORDER_STATUS_META
      .map((m) => ({ label: m.label, count: statusCount.get(m.key) ?? 0, color: m.color }))
      .filter((d) => d.count > 0);

    // Revenue trend: 14 ngày gần nhất từ hóa đơn đã thanh toán.
    const days = 14;
    const trend: { label: string; key: string; revenue: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const label = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      trend.push({ label, key, revenue: 0 });
    }
    const trendMap = new Map(trend.map((t) => [t.key, t]));
    for (const inv of paidInvoices) {
      if (!inv.paidAt) continue;
      const d = new Date(inv.paidAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const bucket = trendMap.get(key);
      if (bucket) bucket.revenue += Number(inv.totalAmount || 0);
    }
    const revenueTrend = trend.map(({ label, revenue }) => ({ label, revenue }));

    // Payment method distribution từ hóa đơn đã thanh toán.
    const methodMap = new Map<string, number>();
    for (const inv of paidInvoices) {
      const label = normalizePaymentLabel(inv.paymentMethod);
      methodMap.set(label, (methodMap.get(label) ?? 0) + 1);
    }
    const paymentDistribution = Array.from(methodMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Recent orders (mới nhất).
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 8);

    const revenue14d = revenueTrend.reduce((s, t) => s + t.revenue, 0);

    return {
      pendingOrders, shippingOrders, openInvoices, pendingPayments, revenueToday, revenue14d,
      orderStatusDistribution, revenueTrend, paymentDistribution, recentOrders,
      totalOrders: orders.length,
    };
  }, [data]);

  const metrics: ProductMetric[] = derived
    ? [
        {
          label: 'Đơn chờ xử lý', value: derived.pendingOrders.toLocaleString('vi-VN'),
          icon: 'pending_actions', tone: 'primary', meta: derived.pendingOrders > 0 ? 'Cần xử lý' : 'Đã xử lý',
          metaTone: derived.pendingOrders > 0 ? 'danger' : 'success',
        },
        {
          label: 'Đơn đang giao', value: derived.shippingOrders.toLocaleString('vi-VN'),
          icon: 'local_shipping', tone: 'secondary', meta: 'Đang vận chuyển', metaTone: 'neutral',
        },
        {
          label: 'Hóa đơn chưa thu', value: derived.openInvoices.toLocaleString('vi-VN'),
          icon: 'receipt_long', tone: 'success', meta: derived.openInvoices > 0 ? 'Chưa thanh toán' : 'Hoàn tất',
          metaTone: derived.openInvoices > 0 ? 'danger' : 'success',
        },
        {
          label: 'Thanh toán chờ xác nhận', value: derived.pendingPayments.toLocaleString('vi-VN'),
          icon: 'payments', tone: 'neutral', meta: derived.pendingPayments > 0 ? 'Cần xác nhận' : 'Đã xác nhận',
          metaTone: derived.pendingPayments > 0 ? 'danger' : 'success',
        },
      ]
    : [];

  const navigate = useNavigate();

  return (
    <StaffLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        {/* ── Header có nhận diện cơ sở ── */}
        <header className="flex flex-col justify-between gap-md rounded-xl border border-slate-border bg-bg-card p-lg shadow-sm lg:flex-row lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-sm text-body-sm font-bold text-primary">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-primary"></span>
              NHÂN VIÊN CỬA HÀNG
              {facilityName && (
                <span className="ml-xs rounded-full border border-primary/20 bg-primary/10 px-sm py-0.5 text-label-xs font-semibold text-primary">
                  <MaterialIcon name="store" className="mr-0.5 align-middle text-[13px]" />
                  {facilityName}
                </span>
              )}
            </div>
            <h1 className="mt-1 text-headline-xl font-bold text-on-surface">Bảng điều khiển Nhân viên</h1>
            <p className="text-body-sm text-secondary">
              {facilityName
                ? `Thống kê dành riêng cho cơ sở: ${facilityName}`
                : 'Tổng quan hoạt động xử lý đơn hàng, giao vận và thanh toán của cơ sở.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchData()}
            disabled={loading}
            className="flex shrink-0 items-center gap-xs rounded-lg border border-slate-border/50 bg-bg-card px-lg py-2.5 text-body-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
          >
            <MaterialIcon name="refresh" className={`text-[18px] ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </header>

        {loading ? (
          <div className="flex h-96 items-center justify-center rounded-xl border border-slate-border bg-bg-card shadow-sm">
            <div className="flex flex-col items-center gap-sm">
              <span className="material-symbols-outlined animate-spin text-[36px] text-primary">sync</span>
              <div className="font-semibold text-secondary">Đang tải dữ liệu...</div>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-error/20 bg-error-container/20 p-xl text-center">
            <span className="material-symbols-outlined text-[48px] text-error">warning</span>
            <p className="mt-md font-medium text-error">{error}</p>
            <button
              onClick={() => void fetchData()}
              className="mt-lg rounded bg-primary px-lg py-sm text-label-md font-bold text-white transition-all hover:bg-primary-hover"
            >
              Thử lại
            </button>
          </div>
        ) : derived ? (
          <div className="space-y-lg animate-fade-in">
            {/* ── Metric cards ── */}
            <section className="grid grid-cols-1 gap-lg md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((m) => (
                <MetricCard key={m.label} metric={m} />
              ))}
            </section>

            {/* ── Charts row 1: revenue trend + payment method ── */}
            <section className="grid grid-cols-1 gap-lg lg:grid-cols-3">
              <div className={`${ds.card.base} ${ds.card.paddingMd} lg:col-span-2 flex flex-col`}>
                <div className="mb-md flex items-end justify-between">
                  <div>
                    <h2 className="text-label-md font-bold text-on-surface">Doanh thu 14 ngày qua</h2>
                    <p className="text-label-xs text-secondary">Tổng hợp từ hóa đơn đã thanh toán</p>
                  </div>
                  <div className="text-right">
                    <p className="text-label-xs text-secondary">Hôm nay</p>
                    <p className="text-label-md font-bold text-primary">{fmtShort(derived.revenueToday)}</p>
                  </div>
                </div>
                {derived.revenue14d === 0 ? (
                  <div className="flex h-64 items-center justify-center text-body-sm text-secondary">
                    Chưa có doanh thu trong 14 ngày qua
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={derived.revenueTrend} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="staffGradRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1a6e3c" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#1a6e3c" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
                        <Tooltip content={<RevenueTooltip />} />
                        <Area type="monotone" dataKey="revenue" name="Doanh thu" stroke="#1a6e3c" strokeWidth={2} fillOpacity={1} fill="url(#staffGradRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className={`${ds.card.base} ${ds.card.paddingMd} flex flex-col`}>
                <div className="mb-md">
                  <h2 className="text-label-md font-bold text-on-surface">Phương thức thanh toán</h2>
                  <p className="text-label-xs text-secondary">Theo số hóa đơn đã thanh toán</p>
                </div>
                {derived.paymentDistribution.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-body-sm text-secondary">
                    Chưa có dữ liệu
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={derived.paymentDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={2}
                        >
                          {derived.paymentDistribution.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any, name: any) => [`${value} hóa đơn`, name]} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </section>

            {/* ── Charts row 2: order status + recent orders ── */}
            <section className="grid grid-cols-1 gap-lg lg:grid-cols-3">
              <div className={`${ds.card.base} ${ds.card.paddingMd} lg:col-span-1 flex flex-col`}>
                <div className="mb-md">
                  <h2 className="text-label-md font-bold text-on-surface">Trạng thái đơn hàng</h2>
                  <p className="text-label-xs text-secondary">Tổng {derived.totalOrders.toLocaleString('vi-VN')} đơn của cơ sở</p>
                </div>
                {derived.orderStatusDistribution.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-body-sm text-secondary">
                    Chưa có đơn hàng
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={derived.orderStatusDistribution} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={<StatusTooltip />} cursor={{ fill: '#f1f5f9' }} />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          {derived.orderStatusDistribution.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className={`${ds.card.base} lg:col-span-2 flex flex-col overflow-hidden`}>
                <div className="flex items-center justify-between border-b border-slate-border/40 p-lg">
                  <div>
                    <h2 className="text-label-md font-bold text-on-surface">Đơn hàng gần đây</h2>
                    <p className="text-label-xs text-secondary">8 đơn mới nhất</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/staff/orders')}
                    className="flex items-center gap-xs text-body-sm font-medium text-primary transition-colors hover:text-primary-hover"
                  >
                    Xem tất cả <MaterialIcon name="arrow_forward" className="text-[16px]" />
                  </button>
                </div>
                {derived.recentOrders.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-body-sm text-secondary">
                    Chưa có đơn hàng
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead className="bg-slate-50 text-label-xs uppercase text-secondary">
                        <tr className="border-b border-slate-border/40">
                          <th className="px-lg py-3">Khách hàng</th>
                          <th className="px-lg py-3">Ngày đặt</th>
                          <th className="px-lg py-3">Trạng thái</th>
                          <th className="px-lg py-3 text-right">Giá trị</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-border/20">
                        {derived.recentOrders.map((o) => {
                          const meta = ORDER_STATUS_META.find((m) => m.key === o.status);
                          return (
                            <tr
                              key={o.id}
                              onClick={() => navigate('/staff/orders')}
                              className="cursor-pointer transition-colors hover:bg-slate-50/50"
                            >
                              <td className="max-w-[200px] truncate px-lg py-3 text-body-sm font-medium text-on-surface">
                                {o.customer?.name || 'Khách vãng lai'}
                              </td>
                              <td className="px-lg py-3 text-body-sm text-secondary">{fmtDate(o.orderDate)}</td>
                              <td className="px-lg py-3">
                                <span
                                  className="inline-flex items-center rounded-full px-sm py-xs text-label-xs font-medium"
                                  style={{ color: meta?.color ?? '#6b7280', backgroundColor: `${meta?.color ?? '#6b7280'}1a` }}
                                >
                                  {meta?.label ?? o.status}
                                </span>
                              </td>
                              <td className="px-lg py-3 text-right text-body-sm font-semibold text-primary">
                                {fmtVND(o.totalAmount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}

      </div>
    </StaffLayout>
  );
};

export default StaffDashboard;

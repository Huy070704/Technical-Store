import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { StaffLayout } from '@/components/staff';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import MetricCard from '@/components/admin/shared/MetricCard';
import { ds } from '@/styles/designSystem';
import { useAuth } from '@/contexts/AuthContext';
import { orderService } from '@/services/orderService';
import type { ProductMetric } from '@/components/admin/types';
import type { OrderListItem } from '@/types/order';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ─── Order type (Online / Tại quầy) ──────────────────────────────────────────
/** orderType: 1 = đơn online, 2 = đơn tại quầy. */
const isOnlineType = (orderType?: number) => orderType === 1;
const orderTypeLabel = (orderType?: number) => (isOnlineType(orderType) ? 'Online' : 'Tại quầy');

const OrderTypeBadge = ({ orderType }: { orderType?: number }) => {
  const online = isOnlineType(orderType);
  return (
    <span
      className={`inline-flex items-center gap-xs whitespace-nowrap rounded-full px-sm py-xs text-label-xs font-medium ${
        online ? 'bg-info/10 text-info' : 'bg-secondary/10 text-secondary'
      }`}
    >
      <MaterialIcon name={online ? 'public' : 'storefront'} className="text-[13px]" />
      {orderTypeLabel(orderType)}
    </span>
  );
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

// ─── Custom tooltip ──────────────────────────────────────────────────────────
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

      setData({ orders });
    } catch (e) {
      console.error(e);
      setError('Không thể tải dữ liệu bảng điều khiển. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchData(); }, [fetchData]);

  // ── Derived metrics & chart data (chỉ liên quan đơn hàng) ──
  const derived = useMemo(() => {
    if (!data) return null;
    const { orders } = data;

    const pendingOrders = orders.filter((o) => o.status === 'PENDING').length;
    const deliveredOrders = orders.filter((o) => o.status === 'DELIVERED').length;
    const completedOrders = orders.filter((o) => o.status === 'SUCCESSFUL').length;

    // Phân loại đơn: Online (orderType=1) vs Tại quầy (orderType=2).
    const onlineCount = orders.filter((o) => isOnlineType(o.orderType)).length;
    const inStoreCount = orders.filter((o) => !isOnlineType(o.orderType)).length;

    // Order status distribution (chỉ giữ trạng thái có dữ liệu).
    const statusCount = new Map<string, number>();
    for (const o of orders) statusCount.set(o.status, (statusCount.get(o.status) ?? 0) + 1);
    const orderStatusDistribution = ORDER_STATUS_META
      .map((m) => ({ label: m.label, count: statusCount.get(m.key) ?? 0, color: m.color }))
      .filter((d) => d.count > 0);

    // Recent orders (mới nhất).
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 8);

    return {
      pendingOrders, deliveredOrders, completedOrders,
      orderStatusDistribution, recentOrders,
      totalOrders: orders.length,
      onlineCount, inStoreCount,
    };
  }, [data]);

  const metrics: ProductMetric[] = derived
    ? [
        {
          label: 'Tổng đơn hàng', value: derived.totalOrders.toLocaleString('vi-VN'),
          icon: 'receipt_long', tone: 'primary', meta: 'Của cơ sở', metaTone: 'neutral',
        },
        {
          label: 'Đơn chờ xử lý', value: derived.pendingOrders.toLocaleString('vi-VN'),
          icon: 'pending_actions', tone: 'secondary', meta: derived.pendingOrders > 0 ? 'Cần xử lý' : 'Đã xử lý',
          metaTone: derived.pendingOrders > 0 ? 'danger' : 'success',
        },
        {
          label: 'Đơn đã giao thành công', value: derived.deliveredOrders.toLocaleString('vi-VN'),
          icon: 'local_shipping', tone: 'neutral', meta: 'Giao thành công', metaTone: 'success',
        },
        {
          label: 'Đơn đã hoàn thành', value: derived.completedOrders.toLocaleString('vi-VN'),
          icon: 'check_circle', tone: 'success', meta: 'Hoàn thành', metaTone: 'success',
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
            <h1 className="mt-1 text-headline-xl font-bold text-on-surface">Tổng quan</h1>
            <p className="text-body-sm text-secondary">
              {facilityName
                ? `Tổng quan cơ sở: ${facilityName}`
                : 'Tổng quan xử lý đơn hàng và giao vận của cơ sở.'}
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
            {/* ── Metric cards (đơn hàng) ── */}
            <section className="grid grid-cols-1 gap-lg md:grid-cols-2 xl:grid-cols-4">
              {metrics.map((m) => (
                <MetricCard key={m.label} metric={m} />
              ))}
            </section>

            {/* ── Phân loại đơn: Online vs Tại quầy ── */}
            <section className="grid grid-cols-1 gap-lg sm:grid-cols-2">
              <div className={`${ds.card.base} ${ds.card.paddingMd} flex items-center gap-md`}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-info/10 text-info">
                  <MaterialIcon name="public" className="text-[24px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-label-xs text-secondary">Đơn Online</p>
                  <p className="text-headline-lg font-bold text-on-surface">
                    {derived.onlineCount.toLocaleString('vi-VN')} <span className="text-label-md font-medium text-secondary">đơn</span>
                  </p>
                </div>
              </div>
              <div className={`${ds.card.base} ${ds.card.paddingMd} flex items-center gap-md`}>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <MaterialIcon name="storefront" className="text-[24px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-label-xs text-secondary">Đơn tại quầy</p>
                  <p className="text-headline-lg font-bold text-on-surface">
                    {derived.inStoreCount.toLocaleString('vi-VN')} <span className="text-label-md font-medium text-secondary">đơn</span>
                  </p>
                </div>
              </div>
            </section>

            {/* ── Trạng thái đơn + Đơn hàng gần đây ── */}
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
                          <th className="px-lg py-3">Loại</th>
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
                              <td className="px-lg py-3"><OrderTypeBadge orderType={o.orderType} /></td>
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

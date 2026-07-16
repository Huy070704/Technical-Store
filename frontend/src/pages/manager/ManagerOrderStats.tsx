import { useEffect, useState, useMemo, useCallback } from 'react';
import { AdminLayout } from '../../components/admin';
import MaterialIcon from '../../components/admin/shared/MaterialIcon';
import {
  statisticsService,
  type DashboardStatistics,
  type ManagerDetailedStats,
} from '@/services/statisticsService';
import { orderService } from '@/services/orderService';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

const ManagerOrderStats = () => {
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
      const [statsData, managerData] = await Promise.all([
        statisticsService.getDashboardData(queryParams),
        statisticsService.getManagerDetailedStats(queryParams),
      ]);
      setStats(statsData);
      setManagerStats(managerData);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu đơn hàng. Vui lòng thử lại sau.');
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
      await statisticsService.exportManagerStats('orders', queryParams);
      toast.success('Xuất báo cáo đơn hàng thành công!');
    } catch {
      toast.error('Không thể xuất báo cáo đơn hàng.');
    } finally {
      setExporting(false);
    }
  };

  const orderStats = useMemo(() => {
    if (!managerStats) return { total: 0, completed: 0, processing: 0, cancelled: 0, pending: 0, shipping: 0 };
    const b = managerStats.orderStatusBreakdown;
    const completed = b.delivered + b.successful;
    const processing = b.processing + b.shipping;
    return {
      total: b.total,
      completed,
      processing,
      cancelled: b.cancelled,
      pending: b.pending,
      shipping: b.shipping,
    };
  }, [managerStats]);

  const [selectedType, setSelectedType] = useState<'ALL' | 'COMPLETED' | 'PROCESSING' | 'CANCELLED'>('ALL');
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersCount, setOrdersCount] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersSearch, setOrdersSearch] = useState('');

  const calculateDateRange = useCallback((range: string, customStart?: string, customEnd?: string) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (range === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (range === '7days') {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (range === 'custom' && customStart && customEnd) {
      const s = new Date(customStart);
      s.setHours(0, 0, 0, 0);
      const e = new Date(customEnd);
      e.setHours(23, 59, 59, 999);
      return { startDate: s.toISOString(), endDate: e.toISOString() };
    } else {
      // 30days
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, []);

  const fetchOrdersDetail = useCallback(async () => {
    if (timeRange === 'custom' && (!customStartDate || !customEndDate)) {
      return;
    }

    try {
      setOrdersLoading(true);
      const { startDate, endDate } = calculateDateRange(timeRange, customStartDate, customEndDate);

      let statusParam: string | undefined = undefined;
      if (selectedType === 'COMPLETED') {
        statusParam = 'DELIVERED,SUCCESSFUL';
      } else if (selectedType === 'PROCESSING') {
        statusParam = 'PENDING,PROCESSING,SHIPPING,DELIVERY_FAILED';
      } else if (selectedType === 'CANCELLED') {
        statusParam = 'CANCELLED';
      }

      const res = await orderService.getStaffOrders({
        page: ordersPage,
        limit: 10,
        status: statusParam,
        startDate,
        endDate,
        search: ordersSearch || undefined,
      });

      setOrders(res.data || []);
      setOrdersCount(res.total || 0);
    } catch (err) {
      console.error('Error fetching orders detail:', err);
      toast.error('Không thể tải danh sách chi tiết đơn hàng.');
    } finally {
      setOrdersLoading(false);
    }
  }, [selectedType, ordersPage, ordersSearch, timeRange, customStartDate, customEndDate, calculateDateRange, toast]);

  useEffect(() => {
    void fetchOrdersDetail();
  }, [fetchOrdersDetail]);

  useEffect(() => {
    setOrdersPage(1);
  }, [selectedType, ordersSearch]);

  const isWaitingForCustomDates = timeRange === 'custom' && (!customStartDate || !customEndDate);

  const completedPct = orderStats.total > 0 ? ((orderStats.completed / orderStats.total) * 100).toFixed(1) : '0';
  const processingPct = orderStats.total > 0 ? ((orderStats.processing / orderStats.total) * 100).toFixed(1) : '0';
  const cancelledPct = orderStats.total > 0 ? ((orderStats.cancelled / orderStats.total) * 100).toFixed(1) : '0';
  const pendingPct = orderStats.total > 0 ? ((orderStats.pending / orderStats.total) * 100).toFixed(1) : '0';

  return (
    <AdminLayout>
      <div className="space-y-lg mx-auto max-w-7xl pb-10">
        {/* Page Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-md bg-bg-card p-lg rounded-xl shadow-sm border border-slate-border">
          <div>
            <div className="flex items-center gap-sm text-primary font-bold text-body-sm">
              <MaterialIcon name="shopping_bag" className="text-[18px]" />
              THỐNG KÊ ĐƠN HÀNG
              {facilityName && (
                <span className="ml-xs px-sm py-0.5 rounded-full bg-primary/10 text-primary text-label-xs font-semibold border border-primary/20">
                  <MaterialIcon name="store" className="text-[13px] align-middle mr-0.5" />
                  {facilityName}
                </span>
              )}
            </div>
            <h1 className="text-headline-xl text-on-surface font-bold mt-1">Thống kê Đơn hàng</h1>
            <p className="text-body-sm text-secondary">
              {facilityName
                ? `Theo dõi đơn hàng tại cơ sở: ${facilityName}`
                : 'Theo dõi số lượng đơn hàng, tỷ lệ chuyển đổi, tỷ lệ hủy đơn và trạng thái xử lý.'}
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-primary text-on-primary text-label-md px-lg py-2.5 rounded-lg font-semibold hover:bg-primary-hover hover:shadow-md active:scale-[0.98] flex items-center gap-xs transition-all duration-200 disabled:opacity-60"
          >
            <MaterialIcon name={exporting ? 'sync' : 'file_download'} className={exporting ? 'animate-spin' : ''} />
            {exporting ? 'Đang xuất...' : 'Xuất Báo Cáo Đơn Hàng'}
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
                className={`px-lg py-1.5 rounded-lg text-label-sm font-bold transition-all duration-200 ${timeRange === opt.id
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
              <div className="text-secondary font-semibold">Đang tải dữ liệu đơn hàng...</div>
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
            {/* Order Status Cards Grid */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-md">
              {/* Card 1: Tổng Số Đơn */}
              <div
                onClick={() => setSelectedType('ALL')}
                className={`bg-bg-card p-lg rounded-xl border shadow-sm cursor-pointer transition-all duration-200 select-none hover:shadow-md hover:scale-[1.01] ${selectedType === 'ALL'
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.02]'
                  : 'border-slate-border hover:border-primary/40'
                  }`}
              >
                <p className="text-label-xs font-bold text-secondary uppercase">Tổng Số Đơn</p>
                <h3 className="text-headline-lg font-bold text-on-surface mt-1">{orderStats.total} đơn</h3>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-md overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '100%' }}></div>
                </div>
              </div>

              {/* Card 2: Đơn Hoàn Thành */}
              <div
                onClick={() => setSelectedType('COMPLETED')}
                className={`bg-bg-card p-lg rounded-xl border shadow-sm cursor-pointer transition-all duration-200 select-none hover:shadow-md hover:scale-[1.01] ${selectedType === 'COMPLETED'
                  ? 'border-tertiary ring-2 ring-tertiary/20 bg-tertiary/[0.02]'
                  : 'border-slate-border hover:border-tertiary/40'
                  }`}
              >
                <p className="text-label-xs font-bold text-tertiary uppercase">Đơn Hoàn Thành</p>
                <h3 className="text-headline-lg font-bold text-tertiary mt-1">{orderStats.completed} đơn</h3>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-md overflow-hidden">
                  <div className="h-full bg-tertiary" style={{ width: `${completedPct}%` }}></div>
                </div>
                <p className="text-label-xs text-secondary mt-xs">{completedPct}% tổng đơn</p>
              </div>

              {/* Card 3: Đơn Đang Xử Lý */}
              <div
                onClick={() => setSelectedType('PROCESSING')}
                className={`bg-bg-card p-lg rounded-xl border shadow-sm cursor-pointer transition-all duration-200 select-none hover:shadow-md hover:scale-[1.01] ${selectedType === 'PROCESSING'
                  ? 'border-warning ring-2 ring-warning/20 bg-warning/[0.02]'
                  : 'border-slate-border hover:border-warning/40'
                  }`}
              >
                <p className="text-label-xs font-bold text-warning uppercase">Đơn Đang Xử Lý</p>
                <h3 className="text-headline-lg font-bold text-warning mt-1">{orderStats.processing} đơn</h3>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-md overflow-hidden">
                  <div className="h-full bg-warning" style={{ width: `${processingPct}%` }}></div>
                </div>
                <p className="text-label-xs text-secondary mt-xs">{processingPct}% tổng đơn</p>
              </div>

              {/* Card 4: Đơn Đã Hủy */}
              <div
                onClick={() => setSelectedType('CANCELLED')}
                className={`bg-bg-card p-lg rounded-xl border shadow-sm cursor-pointer transition-all duration-200 select-none hover:shadow-md hover:scale-[1.01] ${selectedType === 'CANCELLED'
                  ? 'border-error ring-2 ring-error/20 bg-error/[0.02]'
                  : 'border-slate-border hover:border-error/40'
                  }`}
              >
                <p className="text-label-xs font-bold text-error uppercase">Đơn Đã Hủy</p>
                <h3 className="text-headline-lg font-bold text-error mt-1">{orderStats.cancelled} đơn</h3>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-md overflow-hidden">
                  <div className="h-full bg-error" style={{ width: `${cancelledPct}%` }}></div>
                </div>
                <p className="text-label-xs text-secondary mt-xs">{cancelledPct}% tổng đơn</p>
              </div>
            </section>

            {/* Detailed Order List and Recent Transactions */}
            <div className="grid grid-cols-1 gap-lg">
              {/* Left Column: Chi Tiết Đơn Hàng */}
              <div className="w-full bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md border-b border-slate-border/40 pb-md mb-md">
                    <div>
                      <h3 className="text-body-md font-bold">
                        Chi Tiết:{' '}
                        {selectedType === 'ALL'
                          ? 'Tất cả đơn hàng'
                          : selectedType === 'COMPLETED'
                            ? 'Đơn hàng hoàn thành'
                            : selectedType === 'PROCESSING'
                              ? 'Đơn hàng đang xử lý'
                              : 'Đơn hàng đã hủy'}
                      </h3>
                      <p className="text-body-xs text-secondary mt-0.5">
                        Tổng số:{' '}
                        <span className="font-semibold text-on-surface">
                          {ordersCount} đơn hàng
                        </span>
                      </p>
                    </div>
                    {/* Search Bar */}
                    <div className="relative w-full sm:w-64">
                      <MaterialIcon
                        name="search"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-lg"
                      />
                      <input
                        type="text"
                        placeholder="Tìm mã đơn, tên, sđt..."
                        value={ordersSearch}
                        onChange={(e) => setOrdersSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-slate-border/60 bg-bg-soft rounded-lg text-body-xs outline-none focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary/20 transition-all placeholder-secondary/50"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto min-h-[300px] relative">
                    {ordersLoading ? (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                        <div className="flex flex-col items-center gap-xs">
                          <span className="material-symbols-outlined animate-spin text-lg text-primary">sync</span>
                          <span className="text-label-xs text-secondary font-semibold">Đang tải...</span>
                        </div>
                      </div>
                    ) : null}

                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50/50 text-label-xs font-bold text-secondary uppercase border-b border-slate-border/40">
                        <tr>
                          <th className="px-md py-3">Mã Đơn</th>
                          <th className="px-md py-3">Ngày Đặt</th>
                          <th className="px-md py-3">Khách Hàng</th>
                          <th className="px-md py-3 text-center">Trạng Thái</th>
                          <th className="px-md py-3 text-right">Tổng Tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-border/20 text-body-xs">
                        {orders.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-md py-12 text-center text-secondary">
                              Không tìm thấy đơn hàng nào.
                            </td>
                          </tr>
                        ) : (
                          orders.map((o) => (
                            <tr key={o.id} className="hover:bg-slate-50/30">
                              <td className="px-md py-3 font-mono font-bold text-secondary">
                                #{o.id.slice(0, 8).toUpperCase()}
                              </td>
                              <td className="px-md py-3 text-secondary">
                                {new Date(o.orderDate).toLocaleDateString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </td>
                              <td className="px-md py-3">
                                <div className="font-semibold text-on-surface">
                                  {o.customer?.name || 'Khách vãng lai'}
                                </div>
                                {o.customer?.phone && (
                                  <div className="text-[10px] text-secondary font-mono">
                                    {o.customer.phone}
                                  </div>
                                )}
                              </td>
                              <td className="px-md py-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${o.status === 'SUCCESSFUL' || o.status === 'DELIVERED'
                                    ? 'bg-tertiary/10 text-tertiary'
                                    : o.status === 'CANCELLED'
                                      ? 'bg-error/10 text-error'
                                      : 'bg-warning/10 text-warning'
                                    }`}
                                >
                                  {o.status === 'PENDING'
                                    ? 'Chờ xác nhận'
                                    : o.status === 'PROCESSING'
                                      ? 'Đang xử lý'
                                      : o.status === 'SHIPPING'
                                        ? 'Đang giao'
                                        : o.status === 'DELIVERED'
                                          ? 'Đã giao'
                                          : o.status === 'DELIVERY_FAILED'
                                            ? 'Giao thất bại'
                                            : o.status === 'CANCELLED'
                                              ? 'Đã hủy'
                                              : o.status === 'SUCCESSFUL'
                                                ? 'Thành công'
                                                : o.status}
                                </span>
                              </td>
                              <td className="px-md py-3 text-right font-mono font-bold text-on-surface">
                                {formatVND(o.totalAmount)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination Controls */}
                {ordersCount > 10 && (
                  <div className="flex items-center justify-between border-t border-slate-border/40 pt-md mt-md">
                    <button
                      onClick={() => setOrdersPage((prev) => Math.max(1, prev - 1))}
                      disabled={ordersPage === 1 || ordersLoading}
                      className="flex items-center gap-xs px-md py-1.5 border border-slate-border rounded-lg text-label-xs font-semibold text-secondary hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                    >
                      <MaterialIcon name="chevron_left" className="text-sm" />
                      Trước
                    </button>
                    <span className="text-body-xs font-semibold text-secondary">
                      Trang <span className="text-on-surface">{ordersPage}</span> /{' '}
                      {Math.ceil(ordersCount / 10)}
                    </span>
                    <button
                      onClick={() => setOrdersPage((prev) => Math.min(Math.ceil(ordersCount / 10), prev + 1))}
                      disabled={ordersPage >= Math.ceil(ordersCount / 10) || ordersLoading}
                      className="flex items-center gap-xs px-md py-1.5 border border-slate-border rounded-lg text-label-xs font-semibold text-secondary hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                    >
                      Sau
                      <MaterialIcon name="chevron_right" className="text-sm" />
                    </button>
                  </div>
                )}
              </div>


            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManagerOrderStats;

import { useEffect, useState, useMemo, useCallback } from 'react';
import { AdminLayout } from '../../components/admin';
import MaterialIcon from '../../components/admin/shared/MaterialIcon';
import {
  statisticsService,
  type DashboardStatistics,
  type ManagerDetailedStats,
} from '@/services/statisticsService';
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
                  <div className="h-full bg-tertiary" style={{ width: `${completedPct}%` }}></div>
                </div>
                <p className="text-label-xs text-secondary mt-xs">{completedPct}% tổng đơn</p>
              </div>
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
                <p className="text-label-xs font-bold text-warning uppercase">Đơn Đang Xử Lý</p>
                <h3 className="text-headline-lg font-bold text-warning mt-1">{orderStats.processing} đơn</h3>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-md overflow-hidden">
                  <div className="h-full bg-warning" style={{ width: `${processingPct}%` }}></div>
                </div>
                <p className="text-label-xs text-secondary mt-xs">{processingPct}% tổng đơn</p>
              </div>
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
                <p className="text-label-xs font-bold text-error uppercase">Đơn Đã Hủy</p>
                <h3 className="text-headline-lg font-bold text-error mt-1">{orderStats.cancelled} đơn</h3>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-md overflow-hidden">
                  <div className="h-full bg-error" style={{ width: `${cancelledPct}%` }}></div>
                </div>
                <p className="text-label-xs text-secondary mt-xs">{cancelledPct}% tổng đơn</p>
              </div>
            </section>

            {/* Additional breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
              {/* Status breakdown */}
              <div className="bg-bg-card p-lg rounded-xl border border-slate-border shadow-sm">
                <h3 className="text-body-md font-bold mb-sm">Phân Bổ Trạng Thái Đơn Hàng</h3>
                <p className="text-body-xs text-secondary mb-md">Tỷ lệ phân bổ giữa các trạng thái xử lý đơn hàng.</p>
                <div className="space-y-sm">
                  {[
                    { label: 'Chờ xác nhận', value: orderStats.pending, pct: pendingPct, color: 'bg-secondary' },
                    { label: 'Hoàn thành', value: orderStats.completed, pct: completedPct, color: 'bg-tertiary' },
                    { label: 'Đang xử lý / Giao hàng', value: orderStats.processing, pct: processingPct, color: 'bg-warning' },
                    { label: 'Đã hủy', value: orderStats.cancelled, pct: cancelledPct, color: 'bg-error' },
                  ].map((item) => (
                    <div key={item.label} className="space-y-xs">
                      <div className="flex justify-between text-body-xs font-semibold">
                        <span className="text-secondary">{item.label}</span>
                        <span className="text-on-surface">{item.value} đơn ({item.pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${item.pct}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-bg-card rounded-xl border border-slate-border shadow-sm overflow-hidden">
                <div className="p-lg border-b border-slate-border/40 flex justify-between items-center">
                  <div>
                    <h3 className="text-body-md font-bold">Giao Dịch Gần Nhất</h3>
                    <p className="text-body-xs text-secondary">Danh sách hóa đơn phát sinh mới trong hệ thống.</p>
                  </div>
                  <span className="text-label-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">Thực tế phát sinh</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-label-xs font-bold text-secondary uppercase border-b border-slate-border/40">
                      <tr>
                        <th className="px-md py-3">Mã GD</th>
                        <th className="px-md py-3">Khách Hàng</th>
                        <th className="px-md py-3">Trạng Thái</th>
                        <th className="px-md py-3 text-right">Số Tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-border/20 text-body-sm">
                      {stats.recentTransactions.length === 0 ? (
                        <tr><td colSpan={4} className="px-md py-8 text-center text-secondary">Chưa có giao dịch gần đây.</td></tr>
                      ) : stats.recentTransactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/30">
                          <td className="px-md py-3 font-mono font-bold text-secondary text-body-xs">{tx.id.slice(0, 10)}...</td>
                          <td className="px-md py-3 text-on-surface">{tx.entity}</td>
                          <td className="px-md py-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-label-xs font-bold ${tx.status === 'Settled' ? 'bg-tertiary/10 text-tertiary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                              {tx.status === 'Settled' ? 'Thành công' : 'Chờ xử lý'}
                            </span>
                          </td>
                          <td className="px-md py-3 text-right font-mono font-bold text-on-surface">{formatVND(tx.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ManagerOrderStats;

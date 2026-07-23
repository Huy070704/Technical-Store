import { useEffect, useState, useMemo, useCallback } from 'react';
import { AdminLayout, PageHeader, MetricCard } from '../../components/admin';
import MaterialIcon from '../../components/admin/shared/MaterialIcon';
import {
  exportReportService,
  type ExportReportItem,
  type ExportReportKpis,
  type ExportReportPagination,
} from '@/services/exportReportService';
import type { ProductMetric } from '../../components/admin/types/admin';
import { ds } from '@/styles/designSystem';

type TimeRange = 'all' | 'today' | 'week' | 'month' | 'custom';
type Channel = 'all' | 'online' | 'pos';

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'month', label: 'Tháng này' },
  { value: 'custom', label: 'Tùy chọn' },
];

const CHANNEL_OPTIONS: { value: Channel; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'online', label: 'Online (Website)' },
  { value: 'pos', label: 'POS (Tại quầy)' },
];

/* ────────────── Detail Modal ────────────── */
/** Map paymentMethod code → Vietnamese label */
function formatPaymentMethod(method: string | null, exportType: 'Online' | 'POS'): string {
  if (!method) return exportType === 'POS' ? 'Nhận tại quầy' : '—';
  const m = method.toUpperCase();
  if (exportType === 'POS') {
    if (m === 'CASH') return 'Nhận tại quầy — Tiền mặt';
    if (m === 'TRANSFER' || m === 'BANK_TRANSFER' || m === 'ONLINE') return 'Nhận tại quầy — Chuyển khoản';
    return `Nhận tại quầy — ${method}`;
  }
  // Online
  if (m === 'COD') return 'Giao hàng tận nơi — COD';
  if (m === 'ONLINE' || m === 'PAYOS' || m === 'BANK_TRANSFER') return 'Giao hàng — Chuyển khoản / PayOS';
  if (m === 'CASH') return 'Giao hàng — Tiền mặt';
  return `Giao hàng — ${method}`;
}

/** Short label for table badge sub-text */
function shortPaymentLabel(method: string | null, exportType: 'Online' | 'POS'): string {
  if (!method) return exportType === 'POS' ? 'Tại quầy' : '';
  const m = method.toUpperCase();
  if (exportType === 'POS') {
    if (m === 'CASH') return 'Tiền mặt';
    if (m === 'TRANSFER' || m === 'BANK_TRANSFER' || m === 'ONLINE') return 'Chuyển khoản';
    return method;
  }
  if (m === 'COD') return 'COD';
  if (m === 'ONLINE' || m === 'PAYOS' || m === 'BANK_TRANSFER') return 'Chuyển khoản';
  return method;
}

const InfoField = ({ icon, label, value }: { icon: string; label: string; value: string | null }) => (
  <div className="flex items-start gap-2">
    <MaterialIcon name={icon} className="text-[20px] text-secondary mt-[2px]" />
    <div>
      <p className="text-label-xs text-secondary">{label}</p>
      <p className="text-body-sm text-on-surface break-words font-medium">{value || '—'}</p>
    </div>
  </div>
);

const ExportDetailModal = ({ item, onClose, formatDate }: {
  item: ExportReportItem;
  onClose: () => void;
  formatDate: (s: string) => string;
}) => {
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v);

  const paymentLabel = formatPaymentMethod(item.paymentMethod, item.exportType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-lg bg-bg-card shadow-xl flex flex-col max-h-[90vh] border border-slate-border/50 scale-up transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-border/50 px-lg py-md shrink-0">
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">Chi tiết phiếu xuất kho</h2>
            <p className="text-body-sm text-secondary mt-0.5">Thông tin chi tiết về hàng hóa xuất kho và thanh toán.</p>
          </div>
          <button aria-label="Đóng" onClick={onClose} className="rounded p-xs text-secondary transition-colors hover:bg-bg-soft hover:text-on-surface">
            <MaterialIcon name="close" />
          </button>
        </div>

        {/* Body */}
        <div className="p-lg overflow-y-auto space-y-lg flex-grow">
          {/* Header info like facility detail */}
          <div className="flex items-start justify-between gap-md border-b border-slate-border/30 pb-md">
            <div className="flex items-start gap-md">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MaterialIcon name="inventory_2" className="text-[28px]" />
              </div>
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">{item.exportCode}</h3>
                <p className="text-label-xs text-secondary mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                  {item.exportType === 'Online' ? (
                    <>
                      <span>Mã đơn hàng (Website):</span>
                      <span className="font-mono font-semibold text-on-surface">
                        #{item.orderId.slice(0, 8).toUpperCase()}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Mã đơn hàng (POS):</span>
                      <span className="font-mono font-semibold text-on-surface">
                        #{item.orderId.slice(0, 8).toUpperCase()}
                      </span>
                      {!item.orderRef.startsWith('POS-') && (
                        <>
                          <span className="text-secondary/40">|</span>
                          <span>Mã hóa đơn:</span>
                          <span className="font-mono font-semibold text-on-surface">
                            {item.orderRef}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>
            <span className={item.exportType === 'Online' ? ds.badge.success : ds.badge.warning}>
              {item.exportType === 'Online' ? 'Online' : 'POS'}
            </span>
          </div>

          {/* Lưới thông tin (2 cols) */}
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 rounded-lg border border-slate-border/30 bg-slate-50 p-md">
            <InfoField icon="schedule" label="Thời gian xuất kho" value={formatDate(item.exportDate)} />
            <InfoField icon="credit_card" label="Phương thức nhận / Thanh toán" value={paymentLabel} />
            <InfoField icon="package_2" label="Tổng số lượng sản phẩm" value={`${item.totalQuantity.toLocaleString('vi-VN')} sản phẩm`} />
            {item.exportType === 'Online' && item.shippingAddress ? (
              <InfoField icon="location_on" label="Địa chỉ giao hàng" value={item.shippingAddress} />
            ) : (
              <InfoField icon="storefront" label="Cơ sở xuất kho" value="Nhận tại quầy (POS)" />
            )}
          </div>

          {/* Bottom Section: 2-column layout (Left: Products Table, Right: Payments Summary) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
            {/* Products Table (7 cols out of 12) */}
            <div className="md:col-span-7 space-y-sm">
              <h4 className="text-label-md font-bold text-on-surface">Danh sách sản phẩm</h4>
              <div className="rounded-lg border border-slate-border/30 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 text-label-xs text-secondary uppercase border-b border-slate-border/30">
                    <tr>
                      <th className="py-2.5 pl-md pr-2 text-label-xs font-semibold">STT</th>
                      <th className="py-2.5 px-2 text-label-xs font-semibold">Sản phẩm</th>
                      <th className="py-2.5 px-2 text-right text-label-xs font-semibold">SL</th>
                      <th className="py-2.5 pr-md pl-2 text-right text-label-xs font-semibold">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-border/20">
                    {item.products.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 pl-md pr-2 text-body-sm text-secondary">{idx + 1}</td>
                        <td className="py-2.5 px-2 text-body-sm text-on-surface font-medium max-w-[150px] truncate" title={p.name}>{p.name}</td>
                        <td className="py-2.5 px-2 text-body-sm text-on-surface text-right">x{p.quantity}</td>
                        <td className="py-2.5 pr-md pl-2 text-body-sm font-semibold text-on-surface text-right">{formatCurrency(p.unitPrice * p.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Price Breakdown / Summary Box (5 cols out of 12) */}
            <div className="md:col-span-5 space-y-sm">
              <h4 className="text-label-md font-bold text-on-surface">Tổng kết thanh toán</h4>
              <div className="rounded-lg border border-slate-border/30 bg-slate-50/50 p-md space-y-3">
                <div className="flex justify-between text-body-sm text-on-surface">
                  <span className="text-secondary">Tạm tính:</span>
                  <span className="font-medium">{formatCurrency(item.subtotalAmount)}</span>
                </div>
                {item.exportType === 'Online' && (
                  <div className="flex justify-between text-body-sm text-on-surface">
                    <span className="text-secondary">Phí vận chuyển:</span>
                    <span className="font-medium">{item.shippingFee > 0 ? formatCurrency(item.shippingFee) : 'Miễn phí'}</span>
                  </div>
                )}
                {item.vatAmount > 0 && (
                  <div className="flex justify-between text-body-sm text-on-surface">
                    <span className="text-secondary">Thuế VAT:</span>
                    <span className="font-medium">{formatCurrency(item.vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-body-sm font-bold text-on-surface border-t border-slate-border/40 pt-3">
                  <span>Tổng cộng:</span>
                  <span className="text-primary text-label-md">{formatCurrency(item.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-border/50 px-lg py-md shrink-0 flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary shadow-md transition-colors hover:bg-primary-hover">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

/* ────────────── Main Page ────────────── */
const AdminExportReport = () => {
  const [items, setItems] = useState<ExportReportItem[]>([]);
  const [kpis, setKpis] = useState<ExportReportKpis | null>(null);
  const [pagination, setPagination] = useState<ExportReportPagination>({ page: 1, limit: 10, totalItems: 0, totalPages: 1 });

  // Filters
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [channel, setChannel] = useState<Channel>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination & UI
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  // Detail modal
  const [selectedItem, setSelectedItem] = useState<ExportReportItem | null>(null);

  const handleExport = async () => {
    try {
      setExporting(true);
      const params: Record<string, unknown> = {
        timeRange: timeRange === 'custom' ? 'custom' : timeRange,
        channel,
        search: debouncedSearch,
      };
      if (timeRange === 'custom' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      await exportReportService.exportReport(params as any);
    } catch (err) {
      console.error(err);
      alert('Không thể xuất báo cáo. Vui lòng thử lại sau.');
    } finally {
      setExporting(false);
    }
  };

  // Debounce search (400ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [timeRange, channel, debouncedSearch, startDate, endDate]);

  // Handle time range tab click
  const handleTimeRangeChange = useCallback((val: TimeRange) => {
    setTimeRange(val);
    if (val !== 'custom') { setStartDate(''); setEndDate(''); }
  }, []);

  // Fetch
  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, unknown> = {
        timeRange: timeRange === 'custom' ? 'custom' : timeRange,
        channel,
        search: debouncedSearch,
        page: currentPage,
        limit: itemsPerPage,
      };
      if (timeRange === 'custom' && startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const data = await exportReportService.getReport(params as any);
      setItems(data.items);
      setKpis(data.kpis);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
      setError('Không thể tải dữ liệu báo cáo xuất kho. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchReport(); }, [timeRange, channel, debouncedSearch, currentPage, startDate, endDate]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const kpiMetrics: ProductMetric[] = useMemo(() => {
    if (!kpis) return [];
    return [
      { label: 'Tổng SL Xuất', value: kpis.totalExportedQuantity.toLocaleString('vi-VN'), icon: 'package_2', tone: 'primary' as const, meta: 'Tổng sản phẩm đã xuất', metaTone: 'neutral' as const },
      { label: 'Xuất Online', value: kpis.exportedOnline.toLocaleString('vi-VN'), icon: 'language', tone: 'success' as const, meta: 'Qua Website', metaTone: 'success' as const },
      { label: 'Xuất POS', value: kpis.exportedPos.toLocaleString('vi-VN'), icon: 'storefront', tone: 'secondary' as const, meta: 'Tại quầy', metaTone: 'neutral' as const },
      { label: 'Tổng Phiếu Xuất', value: kpis.totalExportTransactions.toLocaleString('vi-VN'), icon: 'receipt_long', tone: 'neutral' as const, meta: 'Đơn hàng hoàn thành', metaTone: 'neutral' as const },
    ];
  }, [kpis]);

  const hasActiveFilters = searchQuery !== '' || channel !== 'all' || timeRange !== 'all';

  const resetAll = () => {
    setTimeRange('all'); setChannel('all'); setSearchQuery(''); setStartDate(''); setEndDate('');
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader 
          title="Báo Cáo Xuất Kho" 
          description="Theo dõi và phân tích hoạt động xuất kho từ các đơn hàng đã hoàn thành." 
          actionLabel={exporting ? 'Đang xuất...' : 'Xuất CSV'}
          actionIcon={exporting ? 'sync' : 'file_download'}
          onActionClick={handleExport}
        />

        {/* KPI Cards */}
        {kpis && (
          <section className="grid grid-cols-1 gap-lg md:grid-cols-2 lg:grid-cols-4">
            {kpiMetrics.map((m) => <MetricCard key={m.label} metric={m} />)}
          </section>
        )}

        {/* Filters */}
        <div className="w-full rounded-2xl border border-slate-border/30 bg-bg-card p-md shadow-sm transition-all duration-300">
          {/* Row 1: Time tabs + Channel + Search + Reset */}
          <div className="flex flex-col gap-md lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-md">
              {/* Time Range Tabs */}
              <div className="flex items-center gap-xs rounded-xl border border-slate-border/50 bg-slate-50 p-1">
                {TIME_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleTimeRangeChange(opt.value)}
                    className={`rounded-lg px-md py-1.5 text-body-sm font-medium transition-all duration-200 ${
                      timeRange === opt.value
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'text-secondary hover:bg-slate-100 hover:text-on-surface'
                    }`}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Channel */}
              <div className="flex items-center gap-sm">
                <label className="text-body-sm font-semibold text-secondary shrink-0">Kênh bán:</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as Channel)}
                  className="min-w-[160px] rounded-xl border border-slate-border/50 bg-slate-50 hover:bg-slate-100 focus:bg-white px-md py-sm text-body-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
                >
                  {CHANNEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Search + Reset */}
            <div className="flex items-center gap-md">
              <div className="relative flex-1 min-w-[240px] md:min-w-[320px]">
                <span className="absolute inset-y-0 left-0 flex items-center pl-md text-secondary">
                  <MaterialIcon name="search" className="text-[20px]" />
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm mã xuất, tên sản phẩm..."
                  className="w-full rounded-xl border border-slate-border/50 bg-slate-50 hover:bg-slate-100 focus:bg-white py-sm pl-[44px] pr-md text-body-sm text-on-surface placeholder-secondary/60 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-md text-slate-400 hover:text-slate-600">
                    <MaterialIcon name="close" className="text-[18px]" />
                  </button>
                )}
              </div>
              {hasActiveFilters && (
                <button
                  onClick={resetAll}
                  className="flex items-center justify-center gap-xs rounded-xl border border-slate-border/50 bg-slate-50 px-md py-sm text-body-sm font-medium text-secondary transition-all hover:bg-slate-200 active:scale-[0.98] shrink-0"
                  title="Xóa tất cả bộ lọc"
                >
                  <MaterialIcon name="restart_alt" className="text-[18px]" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Date range picker (shown when "Tùy chọn" is selected) */}
          {timeRange === 'custom' && (
            <div className="flex flex-wrap items-center gap-md mt-md pt-md border-t border-slate-border/30">
              <MaterialIcon name="date_range" className="text-secondary text-[20px]" />
              <label className="text-body-sm font-semibold text-secondary shrink-0">Từ ngày:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-xl border border-slate-border/50 bg-slate-50 hover:bg-slate-100 focus:bg-white px-md py-sm text-body-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              />
              <label className="text-body-sm font-semibold text-secondary shrink-0">Đến ngày:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-xl border border-slate-border/50 bg-slate-50 hover:bg-slate-100 focus:bg-white px-md py-sm text-body-sm text-on-surface outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 cursor-pointer"
              />
              {startDate && endDate && (
                <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="flex items-center gap-xs text-body-sm text-secondary hover:text-error transition-colors ml-auto md:ml-0"
                >
                  <MaterialIcon name="close" className="text-[18px]" />
                  <span>Xóa</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="flex flex-col space-y-md">
          {error ? (
            <div className="rounded-lg bg-error-container p-4 text-error text-center">
              <p className="mb-2">{error}</p>
              <button onClick={() => void fetchReport()} className="text-sm font-semibold hover:underline">Thử lại</button>
            </div>
          ) : loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-sm">
                <span className="material-symbols-outlined animate-spin text-[32px] text-primary">sync</span>
                <div className="text-secondary font-medium">Đang tải dữ liệu báo cáo...</div>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="py-24 text-center flex flex-col items-center border border-slate-border/30 bg-bg-card rounded-2xl shadow-sm">
              <span className="text-secondary/50 mb-4"><MaterialIcon name="inventory_2" className="text-[48px]" /></span>
              <h3 className="text-headline-sm font-bold text-on-surface">Không tìm thấy dữ liệu xuất kho</h3>
              <p className="mt-2 text-body-sm text-secondary max-w-sm">Thử điều chỉnh bộ lọc hoặc khoảng thời gian để xem dữ liệu.</p>
              <button onClick={resetAll} className="mt-6 text-body-sm font-semibold text-primary hover:text-primary-hover hover:underline">Xóa tất cả bộ lọc</button>
            </div>
          ) : (
            <div className={ds.table.wrap}>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className={`${ds.table.header} bg-slate-50/50`}>
                    <tr className="border-b border-slate-border/40">
                      <th className="py-4 pl-6 pr-4 text-label-md">Mã Xuất</th>
                      <th className="py-4 px-4 text-label-md">Loại Xuất</th>
                      <th className="py-4 px-4 text-label-md">Thời Gian</th>
                      <th className="py-4 px-4 text-label-md">Chi Tiết Sản Phẩm</th>
                      <th className="py-4 pr-6 pl-4 text-label-md text-right">Tổng SL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-border/30">
                    {items.map((item) => (
                      <tr key={item.orderId} className={`${ds.table.row} hover:bg-slate-50/50 transition-colors`}>
                        <td className="py-4 pl-6 pr-4 align-top text-body-sm">
                          <button
                            onClick={() => setSelectedItem(item)}
                            className="font-mono font-semibold text-primary hover:text-primary-hover hover:underline transition-colors cursor-pointer bg-transparent border-none p-0"
                            title="Xem chi tiết phiếu xuất"
                          >
                            {item.exportCode}
                          </button>
                        </td>
                        <td className="py-4 px-4 align-top text-body-sm">
                          <span className={item.exportType === 'Online' ? ds.badge.success : ds.badge.warning}>
                            {item.exportType === 'Online' ? 'Online' : 'POS'}
                          </span>
                        </td>
                        <td className="py-4 px-4 align-top text-body-sm text-on-surface">{formatDate(item.exportDate)}</td>
                        <td className="py-4 px-4 align-top text-body-sm max-w-[320px]">
                          <div className="flex flex-col gap-1.5">
                            {item.products.map((p, idx) => (
                              <div key={idx} className="flex items-center justify-between gap-3">
                                <span className="text-body-sm text-on-surface truncate" title={p.name}>{p.name}</span>
                                <span className="text-body-xs text-secondary font-medium shrink-0">x{p.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 pr-6 pl-4 align-top text-body-sm text-right">
                          <span className="font-semibold text-on-surface">{item.totalQuantity.toLocaleString('vi-VN')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination — always visible when items exist */}
              <div className="flex flex-col gap-md border-t border-slate-border/50 bg-surface-container-low px-lg py-md sm:flex-row sm:items-center sm:justify-between">
                <span className="text-body-sm text-secondary">
                  Hiển thị {items.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} đến{' '}
                  {Math.min(currentPage * itemsPerPage, pagination.totalItems)} trong tổng số {pagination.totalItems} mục
                </span>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center gap-xs">
                    <button
                      aria-label="Trang trước"
                      className="rounded-lg p-sm text-secondary transition-colors hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      type="button"
                    >
                      <MaterialIcon name="chevron_left" />
                    </button>
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - currentPage) <= 1)
                      .map((page, idx, arr) => {
                        const prev = arr[idx - 1];
                        const gap = prev && page - prev > 1;
                        return (
                          <span key={page} className="flex items-center gap-xs">
                            {gap && <span className="px-xs text-secondary">...</span>}
                            <button
                              className={`h-9 min-w-9 rounded-lg px-sm text-label-md transition-colors ${
                                page === currentPage ? 'bg-primary text-on-primary font-semibold' : 'text-secondary hover:bg-bg-soft'
                              }`}
                              onClick={() => setCurrentPage(page)}
                              type="button"
                            >
                              {page}
                            </button>
                          </span>
                        );
                      })}
                    <button
                      aria-label="Trang sau"
                      className="rounded-lg p-sm text-secondary transition-colors hover:bg-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={currentPage === pagination.totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      type="button"
                    >
                      <MaterialIcon name="chevron_right" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <ExportDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} formatDate={formatDate} />
      )}
    </AdminLayout>
  );
};

export default AdminExportReport;

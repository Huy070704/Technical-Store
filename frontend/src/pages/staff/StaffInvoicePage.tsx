import { Fragment, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { StaffLayout, StaffPagination } from '@/components/staff';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import MetricCard from '@/components/admin/shared/MetricCard';
import PageHeader from '@/components/admin/shared/PageHeader';
import { invoiceService, type StaffInvoice, type InvoiceStatus } from '@/services/invoiceService';
import type { ProductMetric } from '@/components/admin/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatVND = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const shortId = (id: string) => id.slice(0, 8).toUpperCase();

const displayInvoiceNumber = (inv: StaffInvoice) =>
  inv.invoiceNumber ?? `#${shortId(inv.id)}`;

const orderTypeLabel = (orderType: number) => (orderType === 2 ? 'Đơn tại quầy' : 'Đơn online');

// ─── Vietnamese amount-in-words ────────────────────────────────────────────────

const VN_DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const VN_UNITS = ['', ' nghìn', ' triệu', ' tỷ'];

const readThreeDigits = (n: number, fullFirst: boolean): string => {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor((n % 100) / 10);
  const donvi = n % 10;
  let s = '';
  if (tram > 0) s += `${VN_DIGITS[tram]} trăm `;
  else if (fullFirst) s += 'không trăm ';

  if (chuc > 1) {
    s += `${VN_DIGITS[chuc]} mươi `;
    if (donvi === 1) s += 'mốt ';
    else if (donvi === 5) s += 'lăm ';
    else if (donvi > 0) s += `${VN_DIGITS[donvi]} `;
  } else if (chuc === 1) {
    s += 'mười ';
    if (donvi === 1) s += 'một ';
    else if (donvi === 5) s += 'lăm ';
    else if (donvi > 0) s += `${VN_DIGITS[donvi]} `;
  } else if (donvi > 0) {
    if (tram > 0 || fullFirst) s += 'lẻ ';
    s += `${VN_DIGITS[donvi]} `;
  }
  return s.trim();
};

const numberToVietnameseWords = (amount: number): string => {
  const num = Math.floor(Math.abs(amount));
  if (num === 0) return 'Không đồng';

  const groups: number[] = [];
  let n = num;
  while (n > 0) {
    groups.unshift(n % 1000);
    n = Math.floor(n / 1000);
  }

  let words = '';
  groups.forEach((g, idx) => {
    if (g === 0) return;
    const unitIndex = groups.length - 1 - idx;
    words += `${readThreeDigits(g, idx > 0)}${VN_UNITS[unitIndex]} `;
  });
  words = words.replace(/\s+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const escapeHtml = (str: string) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
  PAYOS: 'Thanh toán trước',
  COD: 'COD',
};

const PAGE_SIZE = 10;

// ─── StatusBadge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string }> = {
  UNPAID: { label: 'Chưa thanh toán', className: 'bg-amber-100 text-amber-700' },
  PAID: { label: 'Đã thanh toán', className: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Đã hủy', className: 'bg-slate-100 text-slate-600' },
};

const InvoiceStatusBadge = ({ status }: { status: InvoiceStatus }) => {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`rounded-full px-sm py-xs text-label-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
};

const METHOD_BADGE_CLASSES: Record<string, string> = {
  CASH: 'bg-emerald-100 text-emerald-700',
  TRANSFER: 'bg-blue-100 text-blue-700',
  PAYOS: 'bg-violet-100 text-violet-700',
  COD: 'bg-amber-100 text-amber-700',
};

const MethodBadge = ({ method }: { method: string | null }) => {
  if (!method) return <span className="text-secondary">—</span>;
  const label = METHOD_LABELS[method] ?? method;
  const cls = METHOD_BADGE_CLASSES[method] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`rounded-full px-sm py-xs text-label-xs font-medium ${cls}`}>{label}</span>
  );
};

// ─── Receipt (print/export) ────────────────────────────────────────────────────

const buildReceiptHtml = (invoice: StaffInvoice): string => {
  const order = invoice.order;
  const buyerName = escapeHtml(order.customer?.name || order.guestName || 'Khách lẻ');
  const buyerPhone = order.customer?.phone || order.guestPhone;
  const facility = order.facility;
  const items = order.items ?? [];

  const itemsHtml = items
    .map(
      (it) => `
      <span class="item-name">${escapeHtml(it.productName)}</span>
      <span></span>
      <span style="text-align:right;">${it.quantity}</span>
      <span style="text-align:right;">${formatVND(it.unitPrice)}</span>
      <span style="text-align:right;">${formatVND(it.subtotal)}</span>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(displayInvoiceNumber(invoice))}</title>
<style>
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    width: 320px; margin: 0 auto; padding: 16px; color: #111;
  }
  p { margin: 4px 0; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .items { display: grid; grid-template-columns: 1fr auto auto auto; column-gap: 12px; align-items: baseline; font-size: 12px; margin-top: 8px; }
  .items-header { font-weight: 600; border-bottom: 1px dashed #999; padding-bottom: 4px; }
  .item-name { grid-column: 1 / -1; font-weight: 600; padding-top: 6px; }
  .items span { color: #444; }
  .items span.item-name, .items span.items-header { color: #111; }
  .totals { font-size: 12px; margin-top: 8px; }
  .totals div { display: flex; justify-content: space-between; }
  hr { border: none; border-top: 1px dashed #999; margin: 8px 0; }
</style>
</head>
<body>
  <p class="center bold" style="font-size:11px;">${escapeHtml(orderTypeLabel(order.orderType))}</p>
  <p class="center bold" style="font-size:16px;">${escapeHtml(facility?.name || 'TechStore')}</p>
  ${facility?.address ? `<p class="center">Đ/c: ${escapeHtml(facility.address)}</p>` : ''}
  ${facility?.phone ? `<p class="center">Hotline: ${escapeHtml(facility.phone)}</p>` : ''}
  <p>Ngày bán: ${formatDate(invoice.createdAt)}</p>
  <p class="center bold">HÓA ĐƠN BÁN HÀNG</p>
  <p class="center">${escapeHtml(displayInvoiceNumber(invoice))}</p>
  <p>Khách hàng: ${buyerName}${buyerPhone ? ` - ${escapeHtml(buyerPhone)}` : ''}</p>
  <div class="items">
    <span class="items-header">Tên hàng</span><span class="items-header" style="text-align:right;">SL</span><span class="items-header" style="text-align:right;">Đơn giá</span><span class="items-header" style="text-align:right;">Thành tiền</span>
    ${itemsHtml}
  </div>
  <div class="totals">
    <div><span>Cộng tiền hàng:</span><span>${formatVND(order.subtotalAmount)}</span></div>
    ${order.vatAmount > 0 ? `<div><span>Thuế VAT:</span><span>${formatVND(order.vatAmount)}</span></div>` : ''}
    ${order.shippingFee > 0 ? `<div><span>Phí vận chuyển:</span><span>${formatVND(order.shippingFee)}</span></div>` : ''}
    <div class="bold"><span>Tổng cộng:</span><span>${formatVND(invoice.totalAmount)}</span></div>
  </div>
  <p style="font-style:italic;font-size:11px;">${numberToVietnameseWords(invoice.totalAmount)} đồng chẵn</p>
  <p class="center bold" style="margin-top:16px;">Xin cảm ơn quý khách, hẹn gặp lại!</p>
</body>
</html>`;
};

const printInvoice = (invoice: StaffInvoice) => {
  const printWindow = window.open('', '_blank', 'width=400,height=650');
  if (!printWindow) return;
  printWindow.document.write(buildReceiptHtml(invoice));
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => printWindow.print();
};

// ─── InvoiceDetailModal ───────────────────────────────────────────────────────

const InvoiceDetailModal = ({
  invoice,
  onClose,
}: {
  invoice: StaffInvoice;
  onClose: () => void;
}) => {
  const order = invoice.order;
  const buyerName = order.customer?.name || order.guestName || 'Khách lẻ';
  const buyerPhone = order.customer?.phone || order.guestPhone;
  const items = order.items ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
      <div className="w-full max-w-md rounded-2xl bg-bg-card shadow-elevated">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-border/40 px-lg py-md">
          <div className="flex items-center gap-sm">
            <MaterialIcon name="receipt_long" className="text-primary text-[20px]" />
            <h2 className="text-label-md font-semibold text-on-surface">Chi tiết hóa đơn</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-xs text-secondary transition-colors hover:bg-surface-container-low hover:text-on-surface"
          >
            <MaterialIcon name="close" className="text-[20px]" />
          </button>
        </div>

        {/* Body — receipt style */}
        <div className="max-h-[70vh] overflow-y-auto px-lg py-md">
          <div className="space-y-sm rounded-xl border border-dashed border-slate-border/60 bg-surface-container-low/40 p-lg text-body-sm text-on-surface">
            <div className="flex justify-center">
              <span
                className={`rounded-full px-md py-xs text-label-xs font-semibold ${
                  order.orderType === 2 ? 'bg-blue-100 text-blue-700' : 'bg-violet-100 text-violet-700'
                }`}
              >
                {orderTypeLabel(order.orderType)}
              </span>
            </div>

            <div className="text-center">
              <p className="text-body-lg font-bold">{order.facility?.name || 'TechStore'}</p>
              {order.facility?.address && (
                <p className="text-label-xs text-secondary">Đ/c: {order.facility.address}</p>
              )}
              {order.facility?.phone && (
                <p className="text-label-xs text-secondary">Hotline: {order.facility.phone}</p>
              )}
            </div>

            <p className="text-label-xs text-secondary">Ngày bán: {formatDate(invoice.createdAt)}</p>

            <div className="text-center">
              <p className="font-bold uppercase">Hóa đơn bán hàng</p>
              <p className="text-label-xs text-secondary">{displayInvoiceNumber(invoice)}</p>
            </div>

            <p className="text-label-xs">
              Khách hàng: {buyerName}
              {buyerPhone ? ` - ${buyerPhone}` : ''}
            </p>

            <div className="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-md text-label-xs">
              <span className="border-b border-dashed border-slate-border/60 pb-xs font-semibold">Tên hàng</span>
              <span className="border-b border-dashed border-slate-border/60 pb-xs text-right font-semibold">SL</span>
              <span className="border-b border-dashed border-slate-border/60 pb-xs text-right font-semibold">Đơn giá</span>
              <span className="border-b border-dashed border-slate-border/60 pb-xs text-right font-semibold">Thành tiền</span>
              {items.map((it, i) => (
                <Fragment key={i}>
                  <span className="col-span-4 pt-xs font-medium">{it.productName}</span>
                  <span />
                  <span className="text-right text-secondary">{it.quantity}</span>
                  <span className="text-right text-secondary">{formatVND(it.unitPrice)}</span>
                  <span className="text-right text-secondary">{formatVND(it.subtotal)}</span>
                </Fragment>
              ))}
            </div>

            <div className="space-y-xs border-t border-dashed border-slate-border/60 pt-sm">
              <div className="flex justify-between">
                <span>Cộng tiền hàng:</span>
                <span>{formatVND(order.subtotalAmount)}</span>
              </div>
              {order.vatAmount > 0 && (
                <div className="flex justify-between">
                  <span>Thuế VAT:</span>
                  <span>{formatVND(order.vatAmount)}</span>
                </div>
              )}
              {order.shippingFee > 0 && (
                <div className="flex justify-between">
                  <span>Phí vận chuyển:</span>
                  <span>{formatVND(order.shippingFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-primary">
                <span>Tổng cộng:</span>
                <span>{formatVND(invoice.totalAmount)}</span>
              </div>
              <p className="text-label-xs italic text-secondary">
                {numberToVietnameseWords(invoice.totalAmount)} đồng chẵn
              </p>
            </div>

            <p className="pt-sm text-center font-semibold">Xin cảm ơn quý khách, hẹn gặp lại!</p>
          </div>
        </div>

        <div className="flex gap-sm border-t border-slate-border/40 px-lg py-md">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-border/60 px-lg py-sm text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => printInvoice(invoice)}
            className="flex flex-1 items-center justify-center gap-sm rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary transition-colors hover:bg-primary-hover"
          >
            <MaterialIcon name="print" className="text-[18px]" />
            Xuất hóa đơn
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const buildMetrics = (invoices: StaffInvoice[]): ProductMetric[] => {
  const unpaid = invoices.filter((i) => i.status === 'UNPAID');
  const paid = invoices.filter((i) => i.status === 'PAID');
  const cancelled = invoices.filter((i) => i.status === 'CANCELLED');

  return [
    {
      label: 'Tổng hóa đơn',
      value: invoices.length.toString(),
      icon: 'receipt_long',
      tone: 'primary',
      meta: 'Tất cả',
      metaTone: 'neutral',
    },
    {
      label: 'Chưa thanh toán',
      value: unpaid.length.toString(),
      icon: 'pending_actions',
      tone: 'secondary',
      meta: unpaid.length > 0 ? 'Cần xử lý' : 'Đã xử lý hết',
      metaTone: unpaid.length > 0 ? 'danger' : 'success',
    },
    {
      label: 'Đã thanh toán',
      value: paid.length.toString(),
      icon: 'check_circle',
      tone: 'success',
      meta: 'Hoàn thành',
      metaTone: 'success',
    },
    {
      label: 'Đã hủy',
      value: cancelled.length.toString(),
      icon: 'cancel',
      tone: 'danger',
      meta: 'Đã hủy',
      metaTone: 'danger',
    },
  ];
};

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'UNPAID', label: 'Chưa thanh toán' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const METHOD_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả phương thức' },
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'TRANSFER', label: 'Chuyển khoản' },
  { value: 'PAYOS', label: 'Thanh toán trước' },
  { value: 'COD', label: 'COD' },
];

const StaffInvoicePage = () => {
  const [invoices, setInvoices] = useState<StaffInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [detailInvoice, setDetailInvoice] = useState<StaffInvoice | null>(null);

  const deferredSearch = useDeferredValue(search);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await invoiceService.getAll();
      setInvoices(data);
    } catch {
      setError('Không thể tải danh sách hóa đơn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInvoices();
  }, []);

  const filtered = useMemo(() => {
    const kw = deferredSearch.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchSearch =
        !kw ||
        (inv.invoiceNumber ?? '').toLowerCase().includes(kw) ||
        inv.id.toLowerCase().includes(kw) ||
        inv.order.id.toLowerCase().includes(kw) ||
        (inv.order.customer?.name ?? '').toLowerCase().includes(kw) ||
        (inv.order.customer?.email ?? '').toLowerCase().includes(kw) ||
        (inv.order.customer?.phone ?? '').includes(kw) ||
        (inv.order.guestName ?? '').toLowerCase().includes(kw) ||
        (inv.order.guestPhone ?? '').includes(kw);
      const matchStatus = !statusFilter || inv.status === statusFilter;
      const matchMethod = !methodFilter || inv.paymentMethod === methodFilter;
      return matchSearch && matchStatus && matchMethod;
    });
  }, [invoices, deferredSearch, statusFilter, methodFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, statusFilter, methodFilter]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const metrics = useMemo(() => buildMetrics(invoices), [invoices]);

  const METRIC_FILTERS = ['', 'UNPAID', 'PAID', 'CANCELLED'];

  return (
    <StaffLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          title="Quản lý hóa đơn"
          description="Xem, theo dõi và xử lý thanh toán hóa đơn."
        />

        {/* Metrics */}
        <section className="grid grid-cols-1 gap-lg md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m, i) => (
            <button
              key={m.label}
              type="button"
              onClick={() => setStatusFilter(METRIC_FILTERS[i])}
              className={`block w-full rounded-xl text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                statusFilter === METRIC_FILTERS[i] ? 'ring-2 ring-primary/60' : ''
              }`}
            >
              <MetricCard metric={m} />
            </button>
          ))}
        </section>

        {error && (
          <div className="flex items-center gap-sm rounded-xl bg-error-container p-md text-error">
            <MaterialIcon name="error" className="text-[20px]" />
            <span className="flex-1 text-body-sm">{error}</span>
            <button
              type="button"
              onClick={() => void fetchInvoices()}
              className="rounded-lg px-sm py-xs text-label-sm underline hover:no-underline"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-sm rounded-xl border border-slate-border/50 bg-bg-card p-md shadow-sm">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <MaterialIcon
              name="search"
              className="absolute left-md top-1/2 -translate-y-1/2 text-[18px] text-secondary"
            />
            <input
              type="text"
              placeholder="Tìm số HĐ, đơn hàng, tên khách, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-border/60 bg-bg-base py-sm pl-9 pr-md text-body-sm text-on-surface placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-sm top-1/2 -translate-y-1/2 p-xs text-secondary hover:text-on-surface"
              >
                <MaterialIcon name="close" className="text-[15px]" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-border/60 bg-bg-base px-sm py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Method filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="rounded-lg border border-slate-border/60 bg-bg-base px-sm py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            {METHOD_FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <p className="text-label-sm text-secondary">
          {loading ? 'Đang tải...' : `Tổng ${filtered.length} hóa đơn tìm kiếm được`}
        </p>

        {/* Table */}
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-slate-border/50 bg-bg-card">
            <div className="flex items-center gap-sm text-secondary">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
              <span className="text-body-sm">Đang tải hóa đơn...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-md rounded-xl border border-slate-border/50 bg-bg-card text-secondary">
            <MaterialIcon name="receipt_long" className="text-[48px]" />
            <p className="text-body-md">Không có hóa đơn nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-border/50 bg-bg-card shadow-md">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-surface-container-low">
                  {['Số hóa đơn', 'Đơn hàng', 'Khách hàng', 'Tổng tiền', 'Phương thức', 'Trạng thái', 'Ngày TT', ''].map(
                    (h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-md py-sm text-left text-label-sm font-semibold text-secondary"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {paginated.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-t border-slate-border/30 transition-colors hover:bg-surface-container-low/50"
                  >
                    <td className="px-md py-sm">
                      <span className="font-mono text-label-sm font-semibold text-on-surface">
                        {displayInvoiceNumber(inv)}
                      </span>
                    </td>
                    <td className="px-md py-sm">
                      <span className="font-mono text-label-sm text-secondary">
                        {shortId(inv.order.id)}
                      </span>
                    </td>
                    <td className="px-md py-sm text-body-sm text-on-surface">
                      {inv.order.customer?.name || inv.order.guestName ? (
                        <div>
                          <div>{inv.order.customer?.name || inv.order.guestName}</div>
                          {(inv.order.customer?.phone || inv.order.guestPhone) && (
                            <div className="text-label-xs text-secondary">
                              {inv.order.customer?.phone || inv.order.guestPhone}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-secondary">Khách lẻ</span>
                      )}
                    </td>
                    <td className="px-md py-sm text-label-sm font-bold text-primary">
                      {formatVND(inv.totalAmount)}
                    </td>
                    <td className="px-md py-sm">
                      <MethodBadge method={inv.paymentMethod} />
                    </td>
                    <td className="px-md py-sm">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="whitespace-nowrap px-md py-sm text-label-xs text-secondary">
                      {formatDate(inv.paidAt)}
                    </td>
                    <td className="px-md py-sm">
                      <div className="flex items-center gap-xs">
                        {/* View detail */}
                        <button
                          type="button"
                          title="Xem chi tiết"
                          onClick={() => setDetailInvoice(inv)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-border/60 text-secondary transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          <MaterialIcon name="visibility" className="text-[16px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && (
          <StaffPagination
            current={currentPage}
            totalPages={totalPages}
            onChange={setCurrentPage}
            totalLabel={`Tổng ${filtered.length} hóa đơn`}
          />
        )}
      </div>

      {/* Modals */}
      {detailInvoice && (
        <InvoiceDetailModal invoice={detailInvoice} onClose={() => setDetailInvoice(null)} />
      )}
    </StaffLayout>
  );
};

export default StaffInvoicePage;

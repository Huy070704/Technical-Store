import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { StaffLayout } from '@/components/staff';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import MetricCard from '@/components/admin/shared/MetricCard';
import PageHeader from '@/components/admin/shared/PageHeader';
import { invoiceService, type StaffInvoice, type InvoiceStatus } from '@/services/invoiceService';
import type { ProductMetric } from '@/components/admin/types';
import { useToast } from '@/contexts/ToastContext';

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

const isToday = (dateStr: string | null): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
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

const MethodBadge = ({ method }: { method: string | null }) => {
  if (!method) return <span className="text-secondary">—</span>;
  const label = METHOD_LABELS[method] ?? method;
  const cls =
    method === 'CASH'
      ? 'bg-emerald-100 text-emerald-700'
      : 'bg-blue-100 text-blue-700';
  return (
    <span className={`rounded-full px-sm py-xs text-label-xs font-medium ${cls}`}>{label}</span>
  );
};

// ─── InvoiceDetailModal ───────────────────────────────────────────────────────

const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-md border-b border-slate-border/30 py-sm last:border-0">
    <span className="shrink-0 text-label-sm text-secondary">{label}</span>
    <span className="text-right text-body-sm font-medium text-on-surface">{children}</span>
  </div>
);

const InvoiceDetailModal = ({
  invoice,
  onClose,
}: {
  invoice: StaffInvoice;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
    <div className="w-full max-w-lg rounded-2xl bg-bg-card shadow-elevated">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-border/40 px-lg py-md">
        <div className="flex items-center gap-sm">
          <MaterialIcon name="receipt_long" className="text-primary text-[20px]" />
          <h2 className="text-label-md font-semibold text-on-surface">
            Chi tiết hóa đơn — {displayInvoiceNumber(invoice)}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-xs text-secondary transition-colors hover:bg-surface-container-low hover:text-on-surface"
        >
          <MaterialIcon name="close" className="text-[20px]" />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-md px-lg py-md">
        {/* Invoice info */}
        <section>
          <h3 className="mb-sm text-label-sm font-semibold uppercase tracking-wide text-secondary">
            Thông tin hóa đơn
          </h3>
          <DetailRow label="Số hóa đơn">{displayInvoiceNumber(invoice)}</DetailRow>
          <DetailRow label="Trạng thái">
            <InvoiceStatusBadge status={invoice.status} />
          </DetailRow>
          <DetailRow label="Tổng tiền">
            <span className="font-bold text-primary">{formatVND(invoice.totalAmount)}</span>
          </DetailRow>
          <DetailRow label="Phương thức">
            <MethodBadge method={invoice.paymentMethod} />
          </DetailRow>
          <DetailRow label="Ngày thanh toán">{formatDate(invoice.paidAt)}</DetailRow>
          {invoice.notes && <DetailRow label="Ghi chú">{invoice.notes}</DetailRow>}
          <DetailRow label="Ngày tạo">{formatDate(invoice.createdAt)}</DetailRow>
        </section>

        {/* Order info */}
        <section>
          <h3 className="mb-sm text-label-sm font-semibold uppercase tracking-wide text-secondary">
            Thông tin đơn hàng
          </h3>
          <DetailRow label="Mã đơn hàng">
            <span className="font-mono text-label-sm">{shortId(invoice.order.id)}</span>
          </DetailRow>
          <DetailRow label="Ngày đặt">{formatDate(invoice.order.orderDate)}</DetailRow>
          <DetailRow label="Tổng đơn hàng">{formatVND(invoice.order.totalAmount)}</DetailRow>
          {invoice.order.customer && (
            <>
              <DetailRow label="Khách hàng">
                {invoice.order.customer.name ?? '—'}
              </DetailRow>
              <DetailRow label="Email">{invoice.order.customer.email ?? '—'}</DetailRow>
              <DetailRow label="Điện thoại">
                {invoice.order.customer.phone ?? '—'}
              </DetailRow>
            </>
          )}
        </section>
      </div>

      <div className="border-t border-slate-border/40 px-lg py-md">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg border border-slate-border/60 px-lg py-sm text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
        >
          Đóng
        </button>
      </div>
    </div>
  </div>
);

// ─── MarkPaidModal ────────────────────────────────────────────────────────────

const MarkPaidModal = ({
  invoice,
  onConfirm,
  onClose,
  saving,
}: {
  invoice: StaffInvoice;
  onConfirm: (id: string, method: string) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}) => {
  const [method, setMethod] = useState<'CASH' | 'TRANSFER'>(
    (invoice.paymentMethod as 'CASH' | 'TRANSFER') ?? 'CASH',
  );

  const METHODS = [
    { value: 'CASH', label: 'Tiền mặt', icon: 'payments' },
    { value: 'TRANSFER', label: 'Chuyển khoản', icon: 'account_balance' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
      <div className="w-full max-w-md rounded-2xl bg-bg-card shadow-elevated">
        <div className="flex items-center gap-sm border-b border-slate-border/40 px-lg py-md">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <MaterialIcon name="check_circle" className="text-[22px] text-emerald-600" filled />
          </span>
          <div>
            <h2 className="text-label-md font-semibold text-on-surface">Xác nhận thanh toán</h2>
            <p className="text-label-xs text-secondary">{displayInvoiceNumber(invoice)}</p>
          </div>
        </div>

        <div className="space-y-md px-lg py-md">
          <div className="rounded-xl bg-surface-container-low p-md">
            <p className="text-label-xs text-secondary">Số tiền cần thu</p>
            <p className="text-2xl font-bold text-primary">{formatVND(invoice.totalAmount)}</p>
          </div>

          <div className="space-y-sm">
            <p className="text-label-sm font-semibold text-on-surface">Phương thức thanh toán</p>
            {METHODS.map((m) => (
              <label
                key={m.value}
                className={`flex cursor-pointer items-center gap-sm rounded-lg border p-sm transition-all ${
                  method === m.value
                    ? 'border-primary bg-primary-light text-primary'
                    : 'border-slate-border/50 text-secondary hover:border-primary/40 hover:bg-surface-container-low'
                }`}
              >
                <input
                  type="radio"
                  name="markPaidMethod"
                  value={m.value}
                  checked={method === m.value}
                  onChange={() => setMethod(m.value)}
                  className="hidden"
                />
                <MaterialIcon name={m.icon} className="text-[18px]" />
                <span className="flex-1 text-label-sm font-medium">{m.label}</span>
                {method === m.value && (
                  <MaterialIcon name="check_circle" className="text-[16px]" filled />
                )}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-sm border-t border-slate-border/40 px-lg py-md">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-border/60 px-lg py-sm text-label-md text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onConfirm(invoice.id, method)}
            className="flex flex-1 items-center justify-center gap-sm rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                Đang xử lý...
              </>
            ) : (
              <>
                <MaterialIcon name="check_circle" className="text-[18px]" />
                Xác nhận
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────

const Pagination = ({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (page: number) => void;
}) => {
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-xs">
      <button
        type="button"
        disabled={current === 1}
        onClick={() => onChange(current - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-border/60 text-secondary transition-colors hover:bg-surface-container-low disabled:opacity-40"
      >
        <MaterialIcon name="chevron_left" className="text-[18px]" />
      </button>
      {Array.from({ length: total }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onChange(page)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-label-sm transition-colors ${
            page === current
              ? 'bg-primary text-on-primary'
              : 'border border-slate-border/60 text-secondary hover:bg-surface-container-low'
          }`}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        disabled={current === total}
        onClick={() => onChange(current + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-border/60 text-secondary transition-colors hover:bg-surface-container-low disabled:opacity-40"
      >
        <MaterialIcon name="chevron_right" className="text-[18px]" />
      </button>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const buildMetrics = (invoices: StaffInvoice[]): ProductMetric[] => {
  const unpaid = invoices.filter((i) => i.status === 'UNPAID');
  const paid = invoices.filter((i) => i.status === 'PAID');
  const todayRevenue = paid
    .filter((i) => isToday(i.paidAt))
    .reduce((sum, i) => sum + Number(i.totalAmount), 0);

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
      label: 'Doanh thu hôm nay',
      value: formatVND(todayRevenue),
      icon: 'today',
      tone: 'neutral',
      meta: `${paid.filter((i) => isToday(i.paidAt)).length} hóa đơn`,
      metaTone: 'neutral',
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
  const [markPaidInvoice, setMarkPaidInvoice] = useState<StaffInvoice | null>(null);
  const [saving, setSaving] = useState(false);

  const deferredSearch = useDeferredValue(search);
  const toast = useToast();

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
        (inv.order.customer?.name ?? '').toLowerCase().includes(kw) ||
        (inv.order.customer?.email ?? '').toLowerCase().includes(kw);
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

  const handleMarkAsPaid = async (id: string, method: string) => {
    try {
      setSaving(true);
      const updated = await invoiceService.markAsPaid(id, method);
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
      setMarkPaidInvoice(null);
      toast.success('Hóa đơn đã được đánh dấu thanh toán!');
    } catch {
      toast.error('Cập nhật hóa đơn thất bại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (inv: StaffInvoice) => {
    if (!window.confirm(`Hủy hóa đơn ${displayInvoiceNumber(inv)}?`)) return;
    try {
      const updated = await invoiceService.cancel(inv.id);
      setInvoices((prev) => prev.map((i) => (i.id === inv.id ? updated : i)));
      toast.success('Hóa đơn đã được hủy.');
    } catch {
      toast.error('Hủy hóa đơn thất bại. Vui lòng thử lại.');
    }
  };

  return (
    <StaffLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          title="Quản lý hóa đơn"
          description="Xem, theo dõi và xử lý thanh toán hóa đơn."
        />

        {/* Metrics */}
        <section className="grid grid-cols-1 gap-lg md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m) => (
            <MetricCard key={m.label} metric={m} />
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
              placeholder="Tìm số HĐ, tên khách..."
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
          {loading ? 'Đang tải...' : `${filtered.length} hóa đơn`}
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
                      {inv.order.customer?.name ?? (
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

                        {/* Mark as paid */}
                        {inv.status === 'UNPAID' && (
                          <button
                            type="button"
                            title="Đánh dấu đã thanh toán"
                            onClick={() => setMarkPaidInvoice(inv)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 text-emerald-600 transition-colors hover:bg-emerald-50"
                          >
                            <MaterialIcon name="check_circle" className="text-[16px]" />
                          </button>
                        )}

                        {/* Cancel */}
                        {inv.status === 'UNPAID' && (
                          <button
                            type="button"
                            title="Hủy hóa đơn"
                            onClick={() => void handleCancel(inv)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 text-red-500 transition-colors hover:bg-red-50"
                          >
                            <MaterialIcon name="cancel" className="text-[16px]" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <Pagination current={currentPage} total={totalPages} onChange={setCurrentPage} />
        )}
      </div>

      {/* Modals */}
      {detailInvoice && (
        <InvoiceDetailModal invoice={detailInvoice} onClose={() => setDetailInvoice(null)} />
      )}
      {markPaidInvoice && (
        <MarkPaidModal
          invoice={markPaidInvoice}
          saving={saving}
          onConfirm={handleMarkAsPaid}
          onClose={() => setMarkPaidInvoice(null)}
        />
      )}
    </StaffLayout>
  );
};

export default StaffInvoicePage;

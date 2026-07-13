import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { StaffLayout, StaffPagination } from '@/components/staff';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import MetricCard from '@/components/admin/shared/MetricCard';
import PageHeader from '@/components/admin/shared/PageHeader';
import { paymentService, type StaffPayment } from '@/services/paymentService';
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

const PAGE_SIZE = 10;

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
  PAYOS: 'Thanh toán trước',
  COD: 'COD',
};

// ─── Status & Method display ──────────────────────────────────────────────────

type StatusConfig = { label: string; className: string };

/** Chuẩn hóa trạng thái thanh toán về bộ chuẩn HOA (chấp nhận dữ liệu cũ). */
export const normalizePayStatus = (status?: string | null): string => {
  const s = (status ?? '').toUpperCase();
  if (s === 'PAID' || s === 'COMPLETED' || s === 'SUCCESS' || s === 'SUCCESSFUL') return 'PAID';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'CANCELLED';
  if (s === 'FAILED' || s === 'FAILURE') return 'FAILED';
  return 'PENDING';
};

const getStatusConfig = (status: string): StatusConfig => {
  const map: Record<string, StatusConfig> = {
    PENDING: { label: 'Chờ thanh toán', className: 'bg-amber-100 text-amber-700' },
    PAID: { label: 'Đã thanh toán', className: 'bg-emerald-100 text-emerald-700' },
    FAILED: { label: 'Thất bại', className: 'bg-red-100 text-red-700' },
    CANCELLED: { label: 'Đã hủy', className: 'bg-red-100 text-red-700' },
  };
  return map[normalizePayStatus(status)] ?? { label: status, className: 'bg-slate-100 text-slate-600' };
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const cfg = getStatusConfig(status);
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

const MethodBadge = ({ method }: { method: string }) => {
  const label = METHOD_LABELS[method] ?? method;
  const cls = METHOD_BADGE_CLASSES[method] ?? 'bg-slate-100 text-slate-600';
  return (
    <span className={`rounded-full px-sm py-xs text-label-xs font-medium ${cls}`}>{label}</span>
  );
};

// ─── PaymentDetailModal ───────────────────────────────────────────────────────

const DetailRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-md border-b border-slate-border/30 py-sm last:border-0">
    <span className="shrink-0 text-label-sm text-secondary">{label}</span>
    <span className="text-right text-body-sm font-medium text-on-surface">{children}</span>
  </div>
);

const PaymentDetailModal = ({
  payment,
  onClose,
  onConfirm,
  confirming,
}: {
  payment: StaffPayment;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
  confirming: boolean;
}) => {
  const isPending = normalizePayStatus(payment.status) === 'PENDING';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-md">
      <div className="w-full max-w-lg rounded-2xl bg-bg-card shadow-elevated">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-border/40 px-lg py-md">
          <div className="flex items-center gap-sm">
            <MaterialIcon name="payments" className="text-[20px] text-primary" />
            <h2 className="text-label-md font-semibold text-on-surface">Chi tiết thanh toán</h2>
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
          {/* Amount highlight */}
          <div className="rounded-xl bg-surface-container-low p-md text-center">
            <p className="text-label-xs text-secondary">Số tiền thanh toán</p>
            <p className="text-2xl font-bold text-primary">{formatVND(payment.amount)}</p>
            <div className="mt-xs flex justify-center">
              <PaymentStatusBadge status={payment.status} />
            </div>
          </div>

          {/* Payment info */}
          <section>
            <h3 className="mb-sm text-label-sm font-semibold uppercase tracking-wide text-secondary">
              Thông tin thanh toán
            </h3>
            <DetailRow label="Mã thanh toán">
              <span className="font-mono text-label-sm">{shortId(payment.id)}</span>
            </DetailRow>
            <DetailRow label="Phương thức">
              <MethodBadge method={payment.method} />
            </DetailRow>
            {payment.payosOrderCode && (
              <DetailRow label="Mã PayOS">
                <span className="font-mono text-label-sm">{payment.payosOrderCode}</span>
              </DetailRow>
            )}
            <DetailRow label="Thời gian thanh toán">
              {formatDate(payment.paidAt ?? payment.createdAt)}
            </DetailRow>
          </section>

          {/* Order info */}
          <section>
            <h3 className="mb-sm text-label-sm font-semibold uppercase tracking-wide text-secondary">
              Thông tin đơn hàng
            </h3>
            <DetailRow label="Mã đơn hàng">
              <span className="font-mono text-label-sm">{shortId(payment.order.id)}</span>
            </DetailRow>
            <DetailRow label="Ngày đặt">{formatDate(payment.order.orderDate)}</DetailRow>
            <DetailRow label="Giá trị đơn">{formatVND(payment.order.totalAmount)}</DetailRow>
            {payment.order.customer && (
              <>
                <DetailRow label="Khách hàng">
                  {payment.order.customer.name ?? '—'}
                </DetailRow>
                <DetailRow label="Điện thoại">
                  {payment.order.customer.phone ?? '—'}
                </DetailRow>
              </>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex gap-sm border-t border-slate-border/40 px-lg py-md">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-border/60 px-lg py-sm text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
          >
            Đóng
          </button>
          {isPending && (
            <button
              type="button"
              disabled={confirming}
              onClick={() => void onConfirm(payment.id)}
              className="flex flex-1 items-center justify-center gap-sm rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {confirming ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                  Đang xử lý...
                </>
              ) : (
                <>
                  <MaterialIcon name="verified" className="text-[18px]" />
                  Xác nhận thanh toán
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


// ─── Page ─────────────────────────────────────────────────────────────────────

const buildMetrics = (payments: StaffPayment[]): ProductMetric[] => {
  const pending = payments.filter((p) => normalizePayStatus(p.status) === 'PENDING');
  const completed = payments.filter((p) => normalizePayStatus(p.status) === 'PAID');
  const cancelled = payments.filter((p) => normalizePayStatus(p.status) === 'CANCELLED');

  return [
    {
      label: 'Tổng thanh toán',
      value: payments.length.toString(),
      icon: 'receipt',
      tone: 'primary',
      meta: 'Tất cả',
      metaTone: 'neutral',
    },
    {
      label: 'Chờ thanh toán',
      value: pending.length.toString(),
      icon: 'pending_actions',
      tone: 'secondary',
      meta: pending.length > 0 ? 'Cần xử lý' : 'Cập nhật',
      metaTone: pending.length > 0 ? 'danger' : 'success',
    },
    {
      label: 'Đã thanh toán',
      value: completed.length.toString(),
      icon: 'task_alt',
      tone: 'success',
      meta: 'Thành công',
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
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'PENDING', label: 'Chờ thanh toán' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const METHOD_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả phương thức' },
  { value: 'CASH', label: 'Tiền mặt' },
  { value: 'TRANSFER', label: 'Chuyển khoản' },
  { value: 'PAYOS', label: 'Thanh toán trước' },
  { value: 'COD', label: 'COD' },
];

const StaffPaymentPage = () => {
  const [payments, setPayments] = useState<StaffPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [detailPayment, setDetailPayment] = useState<StaffPayment | null>(null);
  const [confirming, setConfirming] = useState(false);

  const deferredSearch = useDeferredValue(search);
  const toast = useToast();

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await paymentService.getAll();
      setPayments(data);
    } catch {
      setError('Không thể tải danh sách thanh toán.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPayments();
  }, []);

  const filtered = useMemo(() => {
    const kw = deferredSearch.trim().toLowerCase();
    return payments.filter((p) => {
      const matchSearch =
        !kw ||
        p.id.toLowerCase().includes(kw) ||
        (p.payosOrderCode ?? '').toLowerCase().includes(kw) ||
        p.order.id.toLowerCase().includes(kw) ||
        (p.order.customer?.name ?? '').toLowerCase().includes(kw);
      const matchStatus = !statusFilter || normalizePayStatus(p.status) === statusFilter;
      const matchMethod = !methodFilter || p.method === methodFilter;
      return matchSearch && matchStatus && matchMethod;
    });
  }, [payments, deferredSearch, statusFilter, methodFilter]);

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

  const metrics = useMemo(() => buildMetrics(payments), [payments]);

  const METRIC_FILTERS = ['', 'PENDING', 'PAID', 'CANCELLED'];

  const handleConfirm = async (id: string) => {
    try {
      setConfirming(true);
      const updated = await paymentService.confirm(id);
      setPayments((prev) => prev.map((p) => (p.id === id ? updated : p)));
      if (detailPayment?.id === id) setDetailPayment(updated);
      toast.success('Thanh toán đã được xác nhận!');
    } catch {
      toast.error('Xác nhận thanh toán thất bại. Vui lòng thử lại.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <StaffLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          title="Quản lý thanh toán"
          description="Theo dõi, xác nhận và kiểm tra trạng thái các giao dịch thanh toán."
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
              onClick={() => void fetchPayments()}
              className="rounded-lg px-sm py-xs text-label-sm underline hover:no-underline"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-sm rounded-xl border border-slate-border/50 bg-bg-card p-md shadow-sm">
          <div className="relative flex-1 min-w-48">
            <MaterialIcon
              name="search"
              className="absolute left-md top-1/2 -translate-y-1/2 text-[18px] text-secondary"
            />
            <input
              type="text"
              placeholder="Tìm mã TT, đơn hàng, tên khách, SĐT ..."
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
          {loading ? 'Đang tải...' : `Tổng ${filtered.length} giao dịch tìm kiếm được`}
        </p>

        {/* Table */}
        {loading ? (
          <div className="flex h-64 items-center justify-center rounded-xl border border-slate-border/50 bg-bg-card">
            <div className="flex items-center gap-sm text-secondary">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
              <span className="text-body-sm">Đang tải thanh toán...</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-md rounded-xl border border-slate-border/50 bg-bg-card text-secondary">
            <MaterialIcon name="payments" className="text-[48px]" />
            <p className="text-body-md">Không có giao dịch nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-border/50 bg-bg-card shadow-md">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-surface-container-low">
                  {['Mã thanh toán', 'Đơn hàng', 'Khách hàng', 'Số tiền', 'Phương thức', 'Trạng thái', 'Thanh toán', ''].map(
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
                {paginated.map((payment) => {
                  return (
                    <tr
                      key={payment.id}
                      className="border-t border-slate-border/30 transition-colors hover:bg-surface-container-low/50"
                    >
                      <td className="px-md py-sm">
                        <span className="font-mono text-label-sm font-semibold text-on-surface">
                          {shortId(payment.id)}
                        </span>
                      </td>
                      <td className="px-md py-sm">
                        <span className="font-mono text-label-sm text-secondary">
                          {shortId(payment.order.id)}
                        </span>
                      </td>
                      <td className="px-md py-sm text-body-sm text-on-surface">
                        {payment.order.customer?.name ? (
                          <div>
                            <div>{payment.order.customer.name}</div>
                            {payment.order.customer.phone && (
                              <div className="text-label-xs text-secondary">
                                {payment.order.customer.phone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-secondary">Khách lẻ</span>
                        )}
                      </td>
                      <td className="px-md py-sm text-label-sm font-bold text-primary">
                        {formatVND(payment.amount)}
                      </td>
                      <td className="px-md py-sm">
                        <MethodBadge method={payment.method} />
                      </td>
                      <td className="px-md py-sm">
                        <PaymentStatusBadge status={payment.status} />
                      </td>
                      <td className="whitespace-nowrap px-md py-sm text-label-xs text-secondary">
                        {formatDate(payment.paidAt ?? payment.createdAt)}
                      </td>
                      <td className="px-md py-sm">
                        <div className="flex items-center gap-xs">
                          {/* View detail */}
                          <button
                            type="button"
                            title="Xem chi tiết"
                            onClick={() => setDetailPayment(payment)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-border/60 text-secondary transition-colors hover:border-primary/40 hover:text-primary"
                          >
                            <MaterialIcon name="visibility" className="text-[16px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
            totalLabel={`Tổng ${filtered.length} thanh toán`}
          />
        )}
      </div>

      {/* Modal */}
      {detailPayment && (
        <PaymentDetailModal
          payment={detailPayment}
          confirming={confirming}
          onConfirm={handleConfirm}
          onClose={() => setDetailPayment(null)}
        />
      )}
    </StaffLayout>
  );
};

export default StaffPaymentPage;

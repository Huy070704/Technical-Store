import { useEffect, useMemo, useRef, useState } from 'react';
import { StaffLayout, StaffPagination } from '@/components/staff';
import PageHeader from '@/components/admin/shared/PageHeader';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import MetricCard from '@/components/admin/shared/MetricCard';
import { orderService } from '@/services/orderService';
import { exportHtmlStringToPdf } from '@/utils/pdfExport';
import { exportSlipHtml } from '@/utils/invoiceTemplates';
import type { OrderDetail, OrderListItem, OrderStatus } from '@/types/order';
import type { ProductMetric } from '@/components/admin/types';
import { useToast } from '@/contexts/ToastContext';

// ─── constants ────────────────────────────────────────────────────────────────

const INSTORE_STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PROCESSING', label: 'Chờ thanh toán' },
  { value: 'SUCCESSFUL', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
  PAYOS: 'Chuyển khoản',
};

const paymentStatusLabel = (raw?: string): string => {
  if (!raw) return 'Chưa thanh toán';
  const s = raw.toUpperCase();
  if (s === 'PAID' || s === 'COMPLETED' || s === 'SUCCESS' || s === 'SUCCESSFUL') return 'Đã thanh toán';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'Đã hủy';
  if (s === 'FAILED') return 'Thất bại';
  return 'Chờ thanh toán';
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING: 'bg-warning/10 text-warning',
  PROCESSING: 'bg-blue-50 text-blue-600',
  SHIPPING: 'bg-tertiary-fixed text-tertiary',
  DELIVERED: 'bg-tertiary/10 text-tertiary',
  DELIVERY_FAILED: 'bg-error/10 text-error',
  CANCELLED: 'bg-error-container text-error',
  SUCCESSFUL: 'bg-emerald-50 text-emerald-700',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Chờ xử lý',
  PROCESSING: 'Chờ thanh toán',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  DELIVERY_FAILED: 'Giao thất bại',
  CANCELLED: 'Đã hủy',
  SUCCESSFUL: 'Hoàn thành',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: OrderStatus }) => (
  <span className={`inline-flex items-center rounded-full px-sm py-xs text-label-xs font-medium ${STATUS_STYLE[status]}`}>
    {STATUS_LABEL[status]}
  </span>
);

// ─── PaymentStatusBadge ───────────────────────────────────────────────────────

const PAYMENT_STATUS_STYLE: Record<string, string> = {
  'Đã thanh toán': 'bg-emerald-100 text-emerald-700',
  'Chưa thanh toán': 'bg-amber-100 text-amber-600',
  'Chờ thanh toán': 'bg-amber-100 text-amber-600',
  'Đã hủy': 'bg-red-100 text-red-600',
  'Thất bại': 'bg-red-100 text-red-600',
};

const PaymentStatusBadge = ({ rawStatus }: { rawStatus?: string }) => {
  const label = paymentStatusLabel(rawStatus);
  const cls = PAYMENT_STATUS_STYLE[label] ?? 'bg-surface-container-highest text-secondary';
  return (
    <span className={`inline-flex items-center rounded-full px-sm py-xs text-label-xs font-medium ${cls}`}>
      {label}
    </span>
  );
};

// ─── CancelOrderModal ─────────────────────────────────────────────────────────

const CancelOrderModal = ({
  orderId,
  onClose,
  onCancelled,
}: {
  orderId: string;
  onClose: () => void;
  onCancelled: () => void;
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const QUICK_REASONS = ['Khách đổi ý', 'Hết hàng', 'Sai thông tin', 'Khách yêu cầu hủy'];

  const handleCancel = async () => {
    if (!reason.trim()) { setError('Vui lòng nhập lý do hủy.'); return; }
    try {
      setLoading(true);
      setError('');
      await orderService.staffCancelOrder(orderId, reason.trim());
      onCancelled();
    } catch (e: any) {
      setError(e?.message ?? 'Hủy đơn thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 z-[70] w-full max-w-md -translate-y-1/2 rounded-2xl bg-bg-card shadow-2xl mx-auto">
        <div className="flex items-center gap-sm border-b border-slate-border/50 px-lg py-md">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-error-container">
            <MaterialIcon name="cancel" className="text-[18px] text-error" />
          </span>
          <div>
            <h2 className="text-label-md font-semibold text-on-surface">Hủy đơn tại quầy</h2>
            <p className="text-label-xs text-secondary">#{orderId.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        <div className="space-y-md px-lg py-md">
          <p className="text-body-sm text-secondary">Chọn hoặc nhập lý do hủy đơn:</p>
          <div className="flex flex-wrap gap-xs">
            {QUICK_REASONS.map((r) => (
              <button key={r} type="button"
                onClick={() => setReason(r)}
                className={`rounded-full px-md py-xs text-label-xs transition-colors ${reason === r
                  ? 'bg-error text-on-primary'
                  : 'border border-slate-border/50 text-secondary hover:border-error/40 hover:text-error'
                  }`}>
                {r}
              </button>
            ))}
          </div>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(''); }}
            placeholder="Nhập lý do hủy..."
            className="w-full rounded-lg border border-slate-border/50 bg-bg-base px-md py-sm text-body-sm text-on-surface placeholder:text-secondary focus:border-error focus:outline-none focus:ring-2 focus:ring-error/10 resize-none"
          />
          {error && (
            <p className="flex items-center gap-xs text-label-xs text-error">
              <MaterialIcon name="error" className="text-[14px]" />{error}
            </p>
          )}
        </div>

        <div className="flex gap-sm border-t border-slate-border/50 px-lg py-md">
          <button type="button" onClick={onClose} disabled={loading}
            className="flex-1 rounded-lg border border-slate-border/50 px-lg py-sm text-label-md text-secondary hover:bg-surface-container-low disabled:opacity-50">
            Giữ đơn
          </button>
          <button type="button" onClick={handleCancel} disabled={loading}
            className="flex flex-1 items-center justify-center gap-sm rounded-lg bg-error px-lg py-sm text-label-md text-on-primary hover:opacity-90 disabled:opacity-50">
            {loading
              ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />Đang hủy...</>
              : <><MaterialIcon name="cancel" className="text-[16px]" />Xác nhận hủy</>}
          </button>
        </div>
      </div>
    </>
  );
};

// ─── PaymentConfirmModal ──────────────────────────────────────────────────────

const PaymentConfirmModal = ({
  orderId,
  totalAmount,
  paymentMethod,
  onClose,
  onSuccess,
}: {
  orderId: string;
  totalAmount: number;
  paymentMethod?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const [mode, setMode] = useState<'pick' | 'qr'>(
    paymentMethod === 'TRANSFER' ? 'qr' : 'pick'
  );
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [loadingQr, setLoadingQr] = useState(false);
  const [confirmingCash, setConfirmingCash] = useState(false);
  const [transferPaid, setTransferPaid] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toast = useToast();

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  // Load QR khi mở ở chế độ TRANSFER
  useEffect(() => {
    if (mode === 'qr' && !checkoutUrl) {
      setLoadingQr(true);
      orderService.getInStorePayosLink(orderId)
        .then((url) => {
          setCheckoutUrl(url);
          pollingRef.current = setInterval(async () => {
            try {
              const status = await orderService.getInStorePaymentStatus(orderId);
              const paid = ['PAID', 'COMPLETED', 'SUCCESS', 'SUCCESSFUL'].includes(status.toUpperCase());
              if (paid) { stopPolling(); setTransferPaid(true); }
            } catch { /* silent */ }
          }, 3000);
        })
        .catch(() => toast.warning('Không tạo được QR thanh toán.'))
        .finally(() => setLoadingQr(false));
    }
    return stopPolling;
  }, [mode]);

  useEffect(() => {
    if (transferPaid) {
      const t = setTimeout(() => { stopPolling(); onSuccess(); }, 1800);
      return () => clearTimeout(t);
    }
  }, [transferPaid]);

  const handleConfirmCash = async () => {
    setConfirmingCash(true);
    try {
      await orderService.completeInStoreOrder(orderId);
      toast.success('Xác nhận thanh toán tiền mặt thành công!');
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xác nhận thất bại.');
    } finally {
      setConfirmingCash(false);
    }
  };

  const fmtVND = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(n);

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-md pointer-events-none">
        <div className={`pointer-events-auto flex w-full flex-col overflow-hidden rounded-2xl bg-bg-card shadow-2xl transition-all ${
          mode === 'qr' ? 'max-w-5xl bg-white' : 'max-w-lg'
        }`} style={mode === 'qr' ? { maxHeight: 'calc(100vh - 32px)' } : undefined}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-lg py-sm shrink-0">
            <div className="flex items-center gap-sm">
              <MaterialIcon name={mode === 'qr' ? "account_balance" : "payments"} className="text-[20px] text-primary" />
              <div>
                <p className="text-label-md font-semibold text-on-surface">
                  {mode === 'qr' ? "Chuyển khoản ngân hàng" : "Tiếp tục thanh toán"}
                </p>
                <p className="text-label-xs text-secondary">
                  {mode === 'qr' ? `Số tiền: ${fmtVND(totalAmount)}` : fmtVND(totalAmount)}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose}
              className="rounded-full p-xs text-secondary hover:bg-surface-container-low hover:text-on-surface">
              <MaterialIcon name="close" className="text-[22px]" />
            </button>
          </div>

          {/* Body */}
          {mode === 'qr' ? (
            <div className="relative flex-1 overflow-hidden bg-white" style={{ minHeight: '600px' }}>
              {transferPaid ? (
                <div className="flex h-full flex-col items-center justify-center gap-md p-lg">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                    <MaterialIcon name="check_circle" className="text-[48px] text-green-600" />
                  </div>
                  <p className="text-xl font-bold text-green-700">Thanh toán thành công!</p>
                  <p className="text-center text-body-sm text-secondary">
                    Khách đã chuyển khoản {fmtVND(totalAmount)}. Đơn hàng đã được hoàn tất.
                  </p>
                  <button type="button" onClick={onClose}
                    className="rounded-lg bg-green-600 px-lg py-sm text-label-sm font-semibold text-white hover:bg-green-700">
                    Đóng
                  </button>
                </div>
              ) : (
                <>
                  {loadingQr && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-md bg-white z-10">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <p className="text-body-sm text-secondary">Đang tải trang thanh toán...</p>
                    </div>
                  )}
                  {checkoutUrl ? (
                    <iframe
                      src={checkoutUrl}
                      title="Trang thanh toán PayOS"
                      className="h-full w-full border-0"
                      style={{ minHeight: '600px' }}
                      sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
                    />
                  ) : (
                    !loadingQr && (
                      <div className="flex h-full flex-col items-center justify-center gap-md">
                        <MaterialIcon name="error" className="text-[40px] text-error" />
                        <p className="text-body-sm text-secondary">Không tạo được QR. Vui lòng thử lại.</p>
                        <button type="button" onClick={() => setMode('pick')}
                          className="text-label-sm text-primary underline">← Quay lại</button>
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="p-lg">
              {transferPaid ? (
                <div className="flex flex-col items-center gap-md py-lg text-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                    <MaterialIcon name="check_circle" className="text-[48px] text-emerald-600" />
                  </div>
                  <p className="text-xl font-bold text-emerald-700">Thanh toán thành công!</p>
                  <p className="text-body-sm text-secondary">Đơn hàng đã được hoàn tất tự động.</p>
                </div>
              ) : (
                <div className="space-y-md">
                  <p className="text-body-sm text-secondary">Chọn phương thức thanh toán để tiếp tục:</p>
                  <button type="button" onClick={handleConfirmCash} disabled={confirmingCash}
                    className="flex w-full items-center gap-md rounded-xl border border-slate-border/50 p-md transition-all hover:border-primary/40 hover:bg-primary-light disabled:opacity-50">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                      <MaterialIcon name="payments" className="text-emerald-600 text-[22px]" />
                    </span>
                    <div className="text-left">
                      <p className="text-label-md font-semibold text-on-surface">
                        {confirmingCash ? 'Đang xác nhận...' : 'Tiền mặt'}
                      </p>
                      <p className="text-label-xs text-secondary">Xác nhận khách đã trả tiền mặt</p>
                    </div>
                  </button>
                  <button type="button" onClick={() => setMode('qr')}
                    className="flex w-full items-center gap-md rounded-xl border border-slate-border/50 p-md transition-all hover:border-primary/40 hover:bg-primary-light">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <MaterialIcon name="qr_code" className="text-blue-600 text-[22px]" />
                    </span>
                    <div className="text-left">
                      <p className="text-label-md font-semibold text-on-surface">Chuyển khoản VietQR</p>
                      <p className="text-label-xs text-secondary">Tạo mã QR để khách quét thanh toán</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          {mode === 'qr' && !transferPaid && checkoutUrl && (
            <div className="flex items-center justify-between border-t border-slate-200 px-lg py-sm shrink-0 bg-white">
              <div className="flex items-center gap-xs text-label-xs text-secondary">
                <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                Đang chờ xác nhận thanh toán...
              </div>
              <div className="flex items-center gap-md">
                <button type="button" onClick={() => setMode('pick')}
                  className="text-label-xs text-secondary hover:text-primary underline">
                  ← Chọn phương thức khác
                </button>
                <a href={checkoutUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-xs text-label-xs text-primary hover:underline">
                  <MaterialIcon name="open_in_new" className="text-[14px]" />
                  Mở tab mới
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ─── OrderDetailDrawer ────────────────────────────────────────────────────────

const OrderDetailDrawer = ({
  orderId,
  onClose,
  onOrderUpdated,
}: {
  orderId: string;
  onClose: () => void;
  onOrderUpdated: (order: OrderListItem) => void;
}) => {
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const loadOrder = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await orderService.getStaffOrderById(orderId);
      setOrder(data);
    } catch {
      setError('Không thể tải thông tin đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadOrder(); }, [orderId]);

  const propagate = (updated: OrderDetail) => {
    onOrderUpdated({
      id: updated.id,
      orderDate: updated.orderDate,
      status: updated.status,
      totalAmount: updated.totalAmount,
      paymentMethod: updated.paymentMethod,
      shippingAddress: updated.shippingAddress,
      customer: updated.customer,
      itemCount: updated.items.length,
      latestPaymentStatus: updated.latestPaymentStatus,
      orderType: updated.orderType,
    });
  };

  const handleCancelled = async () => {
    setShowCancelModal(false);
    await loadOrder();
    if (order) propagate({ ...order, status: 'CANCELLED' });
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentModal(false);
    await loadOrder();
    if (order) propagate({ ...order, status: 'SUCCESSFUL' });
  };

  const handlePrintSlip = async () => {
    if (!order) return;
    await exportHtmlStringToPdf(
      exportSlipHtml(order),
      `phieu-ban-hang-${order.id.slice(0, 8).toUpperCase()}.pdf`,
    );
  };

  const canCancel = order && ['PROCESSING'].includes(order.status);
  const guestName = (order as any)?.guestName ?? null;
  const guestPhone = (order as any)?.guestPhone ?? null;
  const displayName = order?.customer?.name ?? guestName ?? null;
  const displayPhone = order?.customer?.phone ?? guestPhone ?? null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative flex w-full max-w-4xl max-h-[90vh] flex-col bg-bg-card shadow-2xl rounded-2xl overflow-hidden">

          {/* ── Header ── */}
          <div className="flex items-center justify-between border-b border-slate-border/50 px-lg py-md">
            <div className="flex items-center gap-lg">
              <div>
                <h2 className="text-headline-lg font-bold text-on-surface">Chi tiết đơn hàng</h2>
                {order && (
                  <p className="text-label-xs text-secondary">
                    #{order.id.slice(0, 8).toUpperCase()} · {fmtDate(order.orderDate)}
                  </p>
                )}
              </div>
              {order && (
                <div className="flex items-center gap-xs">
                  <span className="inline-flex items-center gap-xs rounded-full bg-surface-container-highest px-sm py-xs text-label-xs font-medium text-on-surface">
                    <MaterialIcon name="storefront" className="text-[12px]" />
                    Tại quầy
                  </span>
                  <StatusBadge status={order.status} />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-xs text-secondary transition-colors hover:bg-surface-container-low hover:text-on-surface"
            >
              <MaterialIcon name="close" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto p-lg" ref={printRef}>
            {loading && (
              <div className="flex h-48 items-center justify-center text-secondary">Đang tải...</div>
            )}
            {error && (
              <div className="flex items-center gap-sm rounded-lg bg-error-container p-md text-error">
                <MaterialIcon name="error" className="text-[18px]" />{error}
              </div>
            )}

            {order && !loading && (
              <div className="space-y-md">
                {order.cancelReason && (
                  <div className="flex items-center gap-sm rounded-lg bg-error-container/50 px-md py-sm text-label-xs text-error">
                    <MaterialIcon name="cancel" className="text-[14px]" />
                    Lý do hủy: {order.cancelReason}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-md lg:grid-cols-2">

                  {/* ── Cột trái ── */}
                  <div className="space-y-md">

                    {/* Khách hàng */}
                    <section className="rounded-xl border border-slate-border/50 bg-bg-base p-md space-y-sm">
                      <h3 className="flex items-center gap-sm text-label-md font-semibold text-on-surface">
                        <MaterialIcon name="person" className="text-primary text-[18px]" />
                        Khách hàng
                      </h3>
                      <dl className="grid grid-cols-2 gap-xs">
                        <div>
                          <dt className="text-label-xs text-secondary">Họ tên</dt>
                          <dd className="text-body-sm text-on-surface font-medium">
                            {displayName ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-label-xs text-secondary">Số điện thoại</dt>
                          <dd className="text-body-sm text-on-surface">
                            {displayPhone ?? '—'}
                          </dd>
                        </div>
                      </dl>
                    </section>

                    {/* Thanh toán */}
                    <section className="rounded-xl border border-slate-border/50 bg-bg-base p-md space-y-sm">
                      <h3 className="flex items-center gap-sm text-label-md font-semibold text-on-surface">
                        <MaterialIcon name="payments" className="text-primary text-[18px]" />
                        Thanh toán
                      </h3>
                      <dl className="grid grid-cols-2 gap-xs">
                        <div>
                          <dt className="text-label-xs text-secondary">Phương thức</dt>
                          <dd className="text-body-sm text-on-surface">
                            {PAYMENT_METHOD_LABELS[order.paymentMethod ?? ''] ?? order.paymentMethod ?? '—'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-label-xs text-secondary">Trạng thái</dt>
                          <dd className="mt-xs">
                            <PaymentStatusBadge rawStatus={order.latestPaymentStatus} />
                          </dd>
                        </div>
                      </dl>
                      {order.payments.length > 0 ? (
                        <ul className="divide-y divide-slate-border/30 pt-xs">
                          {order.payments.map((p, i) => (
                            <li key={i} className="flex justify-between py-xs text-label-xs">
                              <span className="text-secondary">
                                {PAYMENT_METHOD_LABELS[p.method ?? ''] ?? p.method}
                              </span>
                              <span className="font-medium text-on-surface">{fmt.format(p.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-label-xs text-secondary">Chưa có giao dịch nào.</p>
                      )}
                    </section>

                    {/* Ghi chú */}
                    {order.note && (
                      <section className="rounded-xl border border-slate-border/50 bg-bg-base p-md">
                        <h3 className="mb-xs flex items-center gap-sm text-label-md font-semibold text-on-surface">
                          <MaterialIcon name="notes" className="text-primary text-[18px]" />
                          Ghi chú
                        </h3>
                        <p className="text-body-sm text-secondary">{order.note}</p>
                      </section>
                    )}
                  </div>

                  {/* ── Cột phải: sản phẩm ── */}
                  <section className="rounded-xl border border-slate-border/50 bg-bg-base p-md space-y-sm">
                    <h3 className="flex items-center gap-sm text-label-md font-semibold text-on-surface">
                      <MaterialIcon name="inventory_2" className="text-primary text-[18px]" />
                      Sản phẩm ({order.items.length})
                    </h3>
                    <ul className="divide-y divide-slate-border/30">
                      {order.items.map((item) => (
                        <li key={item.productId} className="flex items-center gap-md py-sm">
                          {item.productImage ? (
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="h-12 w-12 shrink-0 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest">
                              <MaterialIcon name="image" className="text-secondary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-body-sm font-medium text-on-surface leading-snug">
                              {item.productName}
                            </p>
                            <p className="text-label-xs text-secondary">
                              {fmt.format(item.unitPrice)} × {item.quantity}
                            </p>
                          </div>
                          <span className="shrink-0 text-body-sm font-semibold text-on-surface">
                            {fmt.format(item.subtotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="space-y-xs border-t border-slate-border/50 pt-sm">
                      <div className="flex justify-between text-body-sm text-secondary">
                        <span>Tiền hàng</span>
                        <span>{fmt.format((order as any).subtotalAmount || (order.totalAmount - ((order as any).vatAmount || 0)))}</span>
                      </div>
                      <div className="flex justify-between text-body-sm text-secondary">
                        <span>Thuế VAT (10%)</span>
                        <span>{fmt.format((order as any).vatAmount || 0)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-border/40 pt-xs">
                        <span className="text-label-md font-semibold text-on-surface">Tổng cộng</span>
                        <span className="text-body-lg font-bold text-primary">{fmt.format(order.totalAmount)}</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex flex-wrap items-center justify-end gap-md border-t border-slate-border/50 px-lg py-md">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-border/50 px-lg py-sm text-label-md text-secondary transition-colors hover:bg-surface-container-low">
              Đóng
            </button>

            {order?.status === 'SUCCESSFUL' && (
              <button type="button" onClick={handlePrintSlip}
                className="flex items-center gap-sm rounded-lg bg-emerald-600 px-lg py-sm text-label-md text-white transition-colors hover:bg-emerald-700 active:scale-95">
                <MaterialIcon name="receipt" className="text-[18px]" />
                In phiếu bán hàng
              </button>
            )}

            {/* Tiếp tục thanh toán — PROCESSING */}
            {canCancel && (
              <button type="button" onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary shadow-sm transition-all hover:opacity-90 active:scale-95">
                <MaterialIcon name="point_of_sale" className="text-[18px]" />
                Tiếp tục thanh toán
              </button>
            )}

            {/* Hủy đơn — PROCESSING */}
            {canCancel && (
              <button type="button" onClick={() => setShowCancelModal(true)}
                className="flex items-center gap-sm rounded-lg border border-error/40 px-lg py-sm text-label-md text-error transition-colors hover:bg-error-container active:scale-95">
                <MaterialIcon name="cancel" className="text-[18px]" />
                Hủy đơn
              </button>
            )}
          </div>
        </div>
      </aside>

      {showCancelModal && order && (
        <CancelOrderModal
          orderId={order.id}
          onClose={() => setShowCancelModal(false)}
          onCancelled={handleCancelled}
        />
      )}

      {showPaymentModal && order && (
        <PaymentConfirmModal
          orderId={order.id}
          totalAmount={order.totalAmount}
          paymentMethod={order.paymentMethod}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const StaffInStoreOrderManagement = () => {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, processing: 0, successful: 0, cancelled: 0 });

  const LIMIT = 10;

  const fetchOrders = async (p: number, status: string) => {
    try {
      setLoading(true);
      setError('');
      if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        setError('Ngày kết thúc ("Đến ngày") không được trước ngày bắt đầu ("Từ ngày").');
        setOrders([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      const res = await orderService.getStaffOrders({
        page: p,
        limit: LIMIT,
        status: status || undefined,
        orderType: 2,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setOrders(res.data);
      setTotal(res.total);
    } catch {
      setError('Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      return;
    }
    try {
      const [all, processing, successful, cancelled] = await Promise.all([
        orderService.getStaffOrders({ page: 1, limit: 1, orderType: 2, startDate: startDate || undefined, endDate: endDate || undefined }),
        orderService.getStaffOrders({ page: 1, limit: 1, status: 'PROCESSING', orderType: 2, startDate: startDate || undefined, endDate: endDate || undefined }),
        orderService.getStaffOrders({ page: 1, limit: 1, status: 'SUCCESSFUL', orderType: 2, startDate: startDate || undefined, endDate: endDate || undefined }),
        orderService.getStaffOrders({ page: 1, limit: 1, status: 'CANCELLED', orderType: 2, startDate: startDate || undefined, endDate: endDate || undefined }),
      ]);
      setStats({
        total: all.total,
        processing: processing.total,
        successful: successful.total,
        cancelled: cancelled.total,
      });
    } catch { /* silent */ }
  };

  useEffect(() => { void fetchOrders(page, statusFilter); }, [page, statusFilter, startDate, endDate]);
  useEffect(() => { void fetchStats(); }, [startDate, endDate]);

  const metrics: ProductMetric[] = useMemo(() => [
    {
      label: 'Tổng đơn tại quầy', value: stats.total.toString(), icon: 'storefront',
      tone: 'primary', meta: 'Tất cả', metaTone: 'neutral',
    },
    {
      label: 'Chờ thanh toán', value: stats.processing.toString(), icon: 'pending_actions',
      tone: 'secondary', meta: stats.processing > 0 ? 'Cần xử lý' : 'Đã xử lý hết',
      metaTone: stats.processing > 0 ? 'danger' : 'success',
    },
    {
      label: 'Hoàn thành', value: stats.successful.toString(), icon: 'check_circle',
      tone: 'success', meta: 'Đã thanh toán', metaTone: 'success',
    },
    {
      label: 'Đã hủy', value: stats.cancelled.toString(), icon: 'cancel',
      tone: 'danger', meta: 'Hủy', metaTone: 'danger',
    },
  ], [stats]);

  const METRIC_FILTERS = ['', 'PROCESSING', 'SUCCESSFUL', 'CANCELLED'];

  const handleOrderUpdated = (updated: OrderListItem) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    void fetchStats();
  };

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(kw) ||
        o.customer?.name?.toLowerCase().includes(kw) ||
        o.customer?.phone?.includes(kw) ||
        (o as any).guestName?.toLowerCase().includes(kw) ||
        (o as any).guestPhone?.includes(kw),
    );
  }, [orders, search]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <StaffLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          title="Đơn hàng tại quầy"
          description="Quản lý tất cả đơn hàng bán trực tiếp tại cửa hàng."
        />

        {/* Metrics */}
        <section className="grid grid-cols-1 gap-lg md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m, i) => (
            <button
              key={m.label}
              type="button"
              onClick={() => { setStatusFilter(METRIC_FILTERS[i]); setPage(1); }}
              className={`block w-full rounded-xl text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${statusFilter === METRIC_FILTERS[i] ? 'ring-2 ring-primary/60' : ''
                }`}
            >
              <MetricCard metric={m} />
            </button>
          ))}
        </section>

        {/* Filters */}
        <div className="flex flex-wrap gap-md items-center">
          <div className="relative flex-1 min-w-[200px]">
            <MaterialIcon name="search" className="absolute left-sm top-1/2 -translate-y-1/2 text-secondary text-[18px]" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT khách hàng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-border/50 bg-bg-card py-sm pl-[36px] pr-md text-body-sm text-on-surface placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>

          <div className="flex items-center gap-xs">
            <span className="text-label-xs text-secondary shrink-0">Từ ngày</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-border/50 bg-bg-card px-md py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none"
            />
            <span className="text-label-xs text-secondary shrink-0">Đến ngày</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-border/50 bg-bg-card px-md py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
                className="rounded-lg border border-error/20 hover:border-error bg-bg-card px-md py-sm text-body-sm text-error transition-colors focus:outline-none focus:ring-2 focus:ring-error/20 active:scale-95"
              >
                Xóa lọc ngày
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-border/50 bg-bg-card px-md py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none"
          >
            {INSTORE_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {error && <div className="rounded-lg bg-error-container p-md text-error">{error}</div>}

        {/* Summary */}
        {!loading && (
          <p className="text-label-xs text-secondary">
            Hiển thị <strong className="text-on-surface">{filtered.length}</strong> đơn tại quầy
          </p>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-border/50 bg-bg-card shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-border/50 bg-surface-container-low">
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Đơn hàng</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Khách hàng</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Ngày tạo</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Tổng tiền</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Trạng thái</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">PT thanh toán</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Xem chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-border/30">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={j} className="px-lg py-md">
                          <div className="h-4 rounded bg-surface-container-highest" />
                        </td>
                      ))}
                    </tr>
                  ))
                  : filtered.length === 0
                    ? (
                      <tr>
                        <td colSpan={9} className="py-xl text-center text-secondary">
                          <div className="flex flex-col items-center gap-sm">
                            <MaterialIcon name="storefront" className="text-[48px] text-secondary/40" />
                            <p>Không có đơn hàng tại quầy nào.</p>
                          </div>
                        </td>
                      </tr>
                    )
                    : filtered.map((order) => {
                      const guestName = (order as any).guestName;
                      const guestPhone = (order as any).guestPhone;
                      const displayName = order.customer?.name ?? guestName ?? null;
                      const displayPhone = order.customer?.phone ?? guestPhone ?? null;
                      return (
                        <tr key={order.id} className="transition-colors hover:bg-surface-container-low">
                          <td className="px-lg py-md">
                            <div className="flex items-center gap-xs">
                              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-highest">
                                <MaterialIcon name="storefront" className="text-[14px] text-secondary" />
                              </span>
                              <span className="font-mono text-label-xs text-secondary">
                                #{order.id.slice(0, 8).toUpperCase()}
                              </span>
                            </div>
                          </td>
                          <td className="px-lg py-md">
                            {displayName ? (
                              <div>
                                <p className="text-body-sm font-medium text-on-surface">{displayName}</p>
                                {displayPhone && (
                                  <p className="text-label-xs text-secondary">{displayPhone}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-label-xs text-secondary">Khách lẻ</span>
                            )}
                          </td>
                          <td className="px-lg py-md text-body-sm text-secondary">{fmtDate(order.orderDate)}</td>
                          <td className="px-lg py-md text-body-sm font-semibold text-on-surface">{fmt.format(order.totalAmount)}</td>
                          <td className="px-lg py-md"><StatusBadge status={order.status} /></td>
                          <td className="px-lg py-md text-body-sm text-secondary">
                            {PAYMENT_METHOD_LABELS[order.paymentMethod ?? ''] ?? order.paymentMethod ?? '—'}
                          </td>
                          <td className="px-lg py-md">
                            <button
                              type="button"
                              onClick={() => setSelectedOrderId(order.id)}
                              className="flex items-center gap-xs rounded-lg border border-slate-border/50 px-sm py-xs text-label-xs text-secondary transition-colors hover:border-primary/50 hover:text-primary"
                            >
                              <MaterialIcon name="visibility" className="text-[16px]" />
                              Xem
                            </button>
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </div>
        {!loading && (
          <StaffPagination
            current={page}
            totalPages={totalPages}
            onChange={setPage}
            totalLabel={`Tổng ${total} đơn tại quầy`}
          />
        )}
      </div>

      {selectedOrderId && (
        <OrderDetailDrawer
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onOrderUpdated={handleOrderUpdated}
        />
      )}
    </StaffLayout>
  );
};

export default StaffInStoreOrderManagement;

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StaffLayout, StaffPagination } from '@/components/staff';
import PageHeader from '@/components/admin/shared/PageHeader';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import MetricCard from '@/components/admin/shared/MetricCard';
import { orderService } from '@/services/orderService';
import { exportHtmlStringToPdf } from '@/utils/pdfExport';
import { exportSlipHtml } from '@/utils/invoiceTemplates';
import type { OrderDetail, OrderListItem, OrderStatus } from '@/types/order';
import type { ProductMetric } from '@/components/admin/types';

// ─── constants ────────────────────────────────────────────────────────────────

/** Trạng thái áp dụng cho đơn online: PENDING → PROCESSING → SHIPPING → DELIVERED | DELIVERY_FAILED | CANCELLED */
const STATUS_OPTIONS = [
  { value: '',                label: 'Tất cả trạng thái' },
  { value: 'PENDING',         label: 'Chờ xử lý' },
  { value: 'PROCESSING',      label: 'Đang xử lý' },
  { value: 'SHIPPING',        label: 'Đang giao' },
  { value: 'DELIVERED',       label: 'Đã giao' },
  { value: 'DELIVERY_FAILED', label: 'Giao thất bại' },
  { value: 'CANCELLED',       label: 'Đã hủy' },
];

/** Nhãn tiếng Việt cho trạng thái thanh toán (chuẩn hóa, chấp nhận dữ liệu cũ). */
const paymentStatusLabel = (raw?: string): string => {
  if (!raw) return 'Chưa thanh toán';
  const s = raw.toUpperCase();
  if (s === 'PAID' || s === 'COMPLETED' || s === 'SUCCESS' || s === 'SUCCESSFUL') return 'Đã thanh toán';
  if (s === 'CANCELLED' || s === 'CANCELED') return 'Đã hủy';
  if (s === 'FAILED' || s === 'FAILURE') return 'Thất bại';
  return 'Chờ thanh toán';
};

/** orderType 1 = online (member), 2 = in-store — trang này chỉ hiển thị online (orderType = 1) */

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING:          'bg-warning/10 text-warning',
  PROCESSING:       'bg-secondary-fixed text-secondary',
  SHIPPING:         'bg-tertiary-fixed text-tertiary',
  DELIVERED:        'bg-tertiary/10 text-tertiary',
  DELIVERY_FAILED:  'bg-error/10 text-error',
  CANCELLED:        'bg-error-container text-error',
  SUCCESSFUL:       'bg-tertiary/10 text-tertiary',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING:          'Chờ xử lý',
  PROCESSING:       'Đang xử lý',
  SHIPPING:         'Đang giao',
  DELIVERED:        'Đã giao',
  DELIVERY_FAILED:  'Giao thất bại',
  CANCELLED:        'Đã hủy',
  SUCCESSFUL:       'Hoàn thành',
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

/** orderType 1 = online (member + guest), 2 = tại quầy */
const isOnlineOrder = (orderType: number) => orderType === 1;

// ─── OrderTypeBadge ───────────────────────────────────────────────────────────

const OrderTypeBadge = ({ orderType }: { orderType: number }) => {
  if (orderType === 2) {
    return (
      <span className="inline-flex items-center gap-xs whitespace-nowrap rounded-full bg-surface-container-highest px-sm py-xs text-label-xs font-medium text-on-surface">
        <MaterialIcon name="storefront" className="text-[12px]" />
        Tại quầy
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-xs whitespace-nowrap rounded-full bg-primary/10 px-sm py-xs text-label-xs font-medium text-primary">
      <MaterialIcon name="public" className="text-[12px]" />
      Online
    </span>
  );
};

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: OrderStatus }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full px-sm py-xs text-label-xs font-medium ${STATUS_STYLE[status]}`}>
    {STATUS_LABEL[status]}
  </span>
);

// ─── PaymentBadge ─────────────────────────────────────────────────────────────

/** Trạng thái thanh toán của đơn (chuẩn hóa, chấp nhận dữ liệu cũ). */
const PaymentBadge = ({ raw }: { raw?: string }) => {
  const s = (raw || '').toUpperCase();
  if (s === 'PAID' || s === 'COMPLETED' || s === 'SUCCESS' || s === 'SUCCESSFUL') {
    return (
      <span className="inline-flex items-center gap-xs whitespace-nowrap rounded-full bg-tertiary/10 px-sm py-xs text-label-xs font-medium text-tertiary">
        <span className="h-[6px] w-[6px] rounded-full bg-tertiary" />
        Đã thanh toán
      </span>
    );
  }
  if (s === 'CANCELLED' || s === 'CANCELED') {
    return (
      <span className="inline-flex items-center gap-xs whitespace-nowrap rounded-full bg-error-container px-sm py-xs text-label-xs font-medium text-error">
        <span className="h-[6px] w-[6px] rounded-full bg-error" />
        Đã hủy
      </span>
    );
  }
  if (s === 'FAILED' || s === 'FAILURE') {
    return (
      <span className="inline-flex items-center gap-xs whitespace-nowrap rounded-full bg-error/10 px-sm py-xs text-label-xs font-medium text-error">
        <span className="h-[6px] w-[6px] rounded-full bg-error" />
        Thất bại
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-xs whitespace-nowrap rounded-full bg-warning/10 px-sm py-xs text-label-xs font-medium text-warning">
      <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-warning" />
      Chờ TT
    </span>
  );
};

// ─── PaymentMethodBadge ───────────────────────────────────────────────────────

/** Phân biệt trực quan đơn thanh toán online (PayOS, trả trước) vs COD (trả tiền mặt khi giao). */
const PaymentMethodBadge = ({ raw }: { raw?: string }) => {
  const s = (raw || '').toUpperCase();
  if (s === 'ONLINE' || s === 'PAYOS') {
    return (
      <span className="inline-flex items-center gap-xs whitespace-nowrap rounded-full bg-info/10 px-sm py-xs text-label-xs font-medium text-info">
        <MaterialIcon name="account_balance" className="text-[13px]" />
        CK
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-xs whitespace-nowrap rounded-full bg-secondary/10 px-sm py-xs text-label-xs font-medium text-secondary">
      <MaterialIcon name="payments" className="text-[13px]" />
      Tiền mặt
    </span>
  );
};

// ─── ExportFormModal ──────────────────────────────────────────────────────────

const ExportFormModal = ({
  order,
  onClose,
}: {
  order: OrderDetail;
  onClose: () => void;
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = async () => {
    await exportHtmlStringToPdf(
      exportSlipHtml(order),
      `phieu-xuat-kho-${order.id.slice(0, 8).toUpperCase()}.pdf`,
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 z-[70] max-h-[90vh] w-full max-w-2xl -translate-y-1/2 overflow-y-auto rounded-2xl bg-bg-card shadow-2xl mx-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-slate-border/50 px-lg py-md">
          <div className="flex items-center gap-sm">
            <MaterialIcon name="output" className="text-primary" />
            <h2 className="text-headline-lg font-bold text-on-surface">Phiếu xuất kho</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-xs text-secondary transition-colors hover:bg-surface-container-low"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        {/* Printable content */}
        <div ref={printRef} className="p-lg space-y-lg">
          {/* Title block */}
          <div>
            <h1 className="text-headline-xl font-bold text-on-surface">PHIẾU XUẤT KHO</h1>
            <p className="text-label-xs text-secondary">
              Mã đơn: #{order.id.slice(0, 8).toUpperCase()} &nbsp;·&nbsp; Ngày lập: {fmtDateTime(order.orderDate)}
            </p>
          </div>

          {/* Customer + delivery info */}
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <section className="rounded-xl border border-slate-border/50 bg-bg-base p-md space-y-xs">
              <h3 className="text-label-md font-semibold text-on-surface">Thông tin khách hàng</h3>
              <dl className="space-y-xs text-body-sm">
                <div className="flex justify-between">
                  <dt className="text-secondary">Họ tên</dt>
                  <dd className="text-on-surface font-medium">{order.customer?.name || 'Vãng lai'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-secondary">Điện thoại</dt>
                  <dd className="text-on-surface">{order.customer?.phone || '—'}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-slate-border/50 bg-bg-base p-md space-y-xs">
              <h3 className="text-label-md font-semibold text-on-surface">Thông tin giao hàng</h3>
              <dl className="space-y-xs text-body-sm">
                <div className="flex justify-between">
                  <dt className="text-secondary">Địa chỉ</dt>
                  <dd className="text-on-surface text-right max-w-[180px]">{order.shippingAddress || '—'}</dd>
                </div>
              </dl>
            </section>
          </div>

          {/* Product table */}
          <section>
            <h3 className="mb-sm text-label-md font-semibold text-on-surface">Danh sách hàng xuất</h3>
            <div className="overflow-hidden rounded-xl border border-slate-border/50">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-md py-sm text-left text-label-xs text-secondary">STT</th>
                    <th className="px-md py-sm text-left text-label-xs text-secondary">Tên sản phẩm</th>
                    <th className="px-md py-sm text-right text-label-xs text-secondary">Đơn giá</th>
                    <th className="px-md py-sm text-right text-label-xs text-secondary">SL</th>
                    <th className="px-md py-sm text-right text-label-xs text-secondary">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-border/30">
                  {order.items.map((item, idx) => (
                    <tr key={item.productId}>
                      <td className="px-md py-sm text-body-sm text-secondary">{idx + 1}</td>
                      <td className="px-md py-sm text-body-sm text-on-surface">{item.productName}</td>
                      <td className="px-md py-sm text-right text-body-sm text-on-surface">{fmt.format(item.unitPrice)}</td>
                      <td className="px-md py-sm text-right text-body-sm font-semibold text-on-surface">{item.quantity}</td>
                      <td className="px-md py-sm text-right text-body-sm font-semibold text-on-surface">{fmt.format(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-border/50 bg-surface-container-low">
                    <td colSpan={3} className="px-md py-sm text-label-md font-semibold text-on-surface">
                      Tổng cộng
                    </td>
                    <td className="px-md py-sm text-right text-label-md font-bold text-on-surface">
                      {order.items.reduce((s, i) => s + i.quantity, 0)}
                    </td>
                    <td className="px-md py-sm text-right text-label-md font-bold text-primary">
                      {fmt.format(order.totalAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Signature row */}
          <div className="flex justify-end gap-xl pt-md">
            <div className="text-center text-label-xs text-secondary">
              <p className="font-medium text-on-surface">Nhân viên xuất kho</p>
              <div className="mt-[48px] border-t border-slate-border pt-xs">(Ký tên)</div>
            </div>
          </div>
        </div>

        {/* Modal footer */}
        <div className="flex justify-end gap-md border-t border-slate-border/50 px-lg py-md">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-border/50 px-lg py-sm text-label-md text-secondary transition-colors hover:bg-surface-container-low"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary transition-colors hover:bg-primary-hover"
          >
            <MaterialIcon name="picture_as_pdf" className="text-[18px]" />
            Tải phiếu xuất PDF
          </button>
        </div>
      </div>
    </>
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

  const QUICK_REASONS = ['Hết hàng', 'Khách không liên hệ được', 'Khách yêu cầu hủy', 'Thông tin sai'];

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
            <h2 className="text-label-md font-semibold text-on-surface">Hủy đơn hàng</h2>
            <p className="text-label-xs text-secondary">#{orderId.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        <div className="space-y-md px-lg py-md">
          <p className="text-body-sm text-secondary">Chọn hoặc nhập lý do hủy đơn:</p>
          <div className="flex flex-wrap gap-xs">
            {QUICK_REASONS.map((r) => (
              <button key={r} type="button"
                onClick={() => setReason(r)}
                className={`rounded-full px-md py-xs text-label-xs transition-colors ${
                  reason === r
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
  const [confirming, setConfirming] = useState(false);
  const [confirmStep, setConfirmStep] = useState<'idle' | 'prompt'>('idle');
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [markingShipping, setMarkingShipping] = useState(false);
  const [markingDeliveryFailed, setMarkingDeliveryFailed] = useState(false);
  const [redelivering, setRedelivering] = useState(false);

  const loadOrder = async () => {
    setLoading(true);
    setError('');
    setConfirmStep('idle');
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

  const handleConfirm = async () => {
    if (!order) return;
    try {
      setConfirming(true);
      const updated = await orderService.confirmOrder(order.id);
      setOrder(updated);
      setConfirmStep('idle');
      propagate(updated);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Xác nhận đơn hàng thất bại.');
    } finally {
      setConfirming(false);
    }
  };

  const handleMarkShipping = async () => {
    if (!order) return;
    try {
      setMarkingShipping(true);
      const updated = await orderService.staffMarkShipping(order.id);
      setOrder(updated);
      propagate(updated);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Cập nhật trạng thái thất bại.');
    } finally {
      setMarkingShipping(false);
    }
  };

  const handleMarkDeliveryFailed = async () => {
    if (!order) return;
    try {
      setMarkingDeliveryFailed(true);
      const updated = await orderService.staffMarkDeliveryFailed(order.id);
      setOrder(updated);
      propagate(updated);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Cập nhật giao thất bại thất bại.');
    } finally {
      setMarkingDeliveryFailed(false);
    }
  };

  const handleRedeliver = async () => {
    if (!order) return;
    try {
      setRedelivering(true);
      const updated = await orderService.staffRedeliverOrder(order.id);
      setOrder(updated);
      propagate(updated);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Giao lại thất bại.');
    } finally {
      setRedelivering(false);
    }
  };

  const handleCancelled = async () => {
    setShowCancelModal(false);
    await loadOrder();
  };

  const online = order ? isOnlineOrder(order.orderType) : false;
  // Đơn trả trước qua PayOS (CK): hệ thống tự duyệt khi khách thanh toán —
  // staff KHÔNG được xác nhận thủ công. Chỉ đơn COD (trả tiền khi giao) mới cần staff duyệt.
  const isPrepaid = ['ONLINE', 'PAYOS'].includes((order?.paymentMethod ?? '').toUpperCase());
  const canCancel = online && order && ['PENDING', 'PROCESSING', 'DELIVERY_FAILED'].includes(order.status);

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* drawer — wide panel */}
      <aside className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative flex w-full max-w-5xl max-h-[90vh] flex-col bg-bg-card shadow-2xl rounded-2xl overflow-hidden">
        {/* header */}
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
                <OrderTypeBadge orderType={order.orderType} />
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

        {/* body */}
        <div className="flex-1 overflow-y-auto p-lg">
          {loading && (
            <div className="flex h-48 items-center justify-center text-secondary">Đang tải...</div>
          )}

          {error && (
            <div className="flex items-center gap-sm rounded-lg bg-error-container p-md text-error">
              <MaterialIcon name="error" className="text-[18px]" />
              {error}
            </div>
          )}

          {order && !loading && (
            <div className="space-y-md">
              {/* Inline confirm prompt — full width */}
              {confirmStep === 'prompt' && order.status === 'PENDING' && (
                <div className="rounded-xl border border-warning/40 bg-warning/5 p-md space-y-sm">
                  <p className="text-body-sm font-medium text-on-surface">
                    Xác nhận đơn hàng #{order.id.slice(0, 8).toUpperCase()}?
                  </p>
                  <p className="text-label-xs text-secondary">
                    Trạng thái sẽ chuyển từ <strong>Chờ xử lý</strong> sang <strong>Đang xử lý</strong>. Sau đó bạn có thể tạo phiếu xuất kho.
                  </p>
                  <div className="flex gap-sm">
                    <button
                      type="button"
                      disabled={confirming}
                      onClick={handleConfirm}
                      className="flex items-center gap-xs rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
                    >
                      {confirming ? (
                        <MaterialIcon name="hourglass_empty" className="animate-spin text-[16px]" />
                      ) : (
                        <MaterialIcon name="check" className="text-[16px]" />
                      )}
                      {confirming ? 'Đang xử lý...' : 'Xác nhận'}
                    </button>
                    <button
                      type="button"
                      disabled={confirming}
                      onClick={() => setConfirmStep('idle')}
                      className="rounded-lg border border-slate-border/50 px-lg py-sm text-label-md text-secondary transition-colors hover:bg-surface-container-low"
                    >
                      Hủy bỏ
                    </button>
                  </div>
                </div>
              )}

              {order.cancelReason && (
                <div className="flex items-center gap-sm rounded-lg bg-error-container/50 px-md py-sm text-label-xs text-error">
                  <MaterialIcon name="cancel" className="text-[14px]" />
                  Lý do hủy: {order.cancelReason}
                </div>
              )}

              {/* ── 2-column layout ─────────────────────── */}
              <div className="grid grid-cols-1 gap-md lg:grid-cols-2">

                {/* ── Cột trái: thông tin nhỏ ───────────── */}
                <div className="space-y-md">

                  {/* Thông tin khách hàng */}
                  <section className="rounded-xl border border-slate-border/50 bg-bg-base p-md space-y-sm">
                    <h3 className="flex items-center gap-sm text-label-md font-semibold text-on-surface">
                      <MaterialIcon name="person" className="text-primary text-[18px]" />
                      Khách hàng
                    </h3>
                    {order.customer ? (
                      <dl className="grid grid-cols-2 gap-xs">
                        <div>
                          <dt className="text-label-xs text-secondary">Họ tên</dt>
                          <dd className="text-body-sm text-on-surface">{order.customer.name || '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-label-xs text-secondary">Số điện thoại</dt>
                          <dd className="text-body-sm text-on-surface">{order.customer.phone || '—'}</dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-label-xs text-secondary">Email</dt>
                          <dd className="text-body-sm text-on-surface">{order.customer.email}</dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-label-xs text-secondary">Địa chỉ giao</dt>
                          <dd className="text-body-sm text-on-surface">{order.shippingAddress || '—'}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-body-sm text-secondary">Khách vãng lai</p>
                    )}
                  </section>

                  {/* Giao hàng */}
                  <section className="rounded-xl border border-slate-border/50 bg-bg-base p-md space-y-sm">
                    <h3 className="flex items-center gap-sm text-label-md font-semibold text-on-surface">
                      <MaterialIcon name="local_shipping" className="text-primary text-[18px]" />
                      Giao hàng
                    </h3>
                    <dl className="grid grid-cols-2 gap-xs">
                      <div>
                        <dt className="text-label-xs text-secondary">Trạng thái</dt>
                        <dd className="mt-xs"><StatusBadge status={order.status} /></dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-label-xs text-secondary">Yêu cầu hóa đơn VAT</dt>
                        <dd className="text-body-sm text-on-surface">{order.requireInvoice ? 'Có' : 'Không'}</dd>
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
                        <dd className="mt-xs"><PaymentMethodBadge raw={order.paymentMethod} /></dd>
                      </div>
                      <div>
                        <dt className="text-label-xs text-secondary">Trạng thái</dt>
                        <dd className="text-body-sm text-on-surface">{paymentStatusLabel(order.latestPaymentStatus)}</dd>
                      </div>
                    </dl>
                    {order.payments.length > 0 ? (
                      <ul className="divide-y divide-slate-border/30">
                        {order.payments.map((p, i) => (
                          <li key={i} className="flex justify-between py-xs text-label-xs">
                            <span className="text-secondary">{p.method} · {p.status}</span>
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

                {/* ── Cột phải: sản phẩm ────────────────── */}
                <section className="rounded-xl border border-slate-border/50 bg-bg-base p-md space-y-sm">
                  <h3 className="flex items-center gap-sm text-label-md font-semibold text-on-surface">
                    <MaterialIcon name="inventory_2" className="text-primary text-[18px]" />
                    Sản phẩm ({order.items.length})
                  </h3>
                  <ul className="divide-y divide-slate-border/30">
                    {order.items.map((item) => (
                      <li key={item.productId} className="flex items-center gap-md py-sm">
                        {item.productImage ? (
                          <img src={item.productImage} alt={item.productName} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest">
                            <MaterialIcon name="image" className="text-secondary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-body-sm font-medium text-on-surface leading-snug">{item.productName}</p>
                          <p className="text-label-xs text-secondary">{fmt.format(item.unitPrice)} × {item.quantity}</p>
                        </div>
                        <span className="shrink-0 text-body-sm font-semibold text-on-surface">{fmt.format(item.subtotal)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex items-center justify-between border-t border-slate-border/50 pt-sm">
                    <span className="text-label-md font-semibold text-on-surface">Tổng cộng</span>
                    <span className="text-body-lg font-bold text-primary">{fmt.format(order.totalAmount)}</span>
                  </div>
                </section>

              </div>
            </div>
          )}
        </div>

        {/* footer — action buttons theo status */}
        <div className="flex flex-wrap items-center justify-end gap-md border-t border-slate-border/50 px-lg py-md">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-border/50 px-lg py-sm text-label-md text-secondary transition-colors hover:bg-surface-container-low"
          >
            Đóng
          </button>

          {/* Hủy đơn — online, PENDING/PROCESSING */}
          {canCancel && (
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-sm rounded-lg border border-error/40 px-lg py-sm text-label-md text-error transition-colors hover:bg-error-container active:scale-95"
            >
              <MaterialIcon name="cancel" className="text-[18px]" />
              Hủy đơn
            </button>
          )}

          {/* Xác nhận đơn — PENDING + online + COD (đơn CK do PayOS tự duyệt) */}
          {order?.status === 'PENDING' && online && !isPrepaid && confirmStep === 'idle' && (
            <button
              type="button"
              onClick={() => setConfirmStep('prompt')}
              className="flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary transition-colors hover:bg-primary-hover active:scale-95"
            >
              <MaterialIcon name="check_circle" className="text-[18px]" />
              Xác nhận đơn
            </button>
          )}

          {/* Đơn CK chưa thanh toán — không cho duyệt thủ công, hệ thống tự xử lý */}
          {order?.status === 'PENDING' && online && isPrepaid && (
            <div className="flex items-center gap-sm rounded-lg bg-info/10 px-md py-sm text-label-xs text-info">
              <MaterialIcon name="info" className="text-[16px]" />
              Đơn thanh toán chuyển khoản — hệ thống tự duyệt sau khi khách thanh toán, không cần xác nhận thủ công.
            </div>
          )}

          {/* Phiếu xuất kho — PROCESSING */}
          {order?.status === 'PROCESSING' && (
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-sm rounded-lg bg-secondary px-lg py-sm text-label-md text-on-primary transition-colors hover:opacity-90 active:scale-95"
            >
              <MaterialIcon name="output" className="text-[18px]" />
              Phiếu xuất kho
            </button>
          )}

          {/* Bàn giao shipper → SHIPPING — PROCESSING + online */}
          {order?.status === 'PROCESSING' && online && (
            <button
              type="button"
              disabled={markingShipping}
              onClick={handleMarkShipping}
              className="flex items-center gap-sm rounded-lg bg-tertiary px-lg py-sm text-label-md text-on-primary transition-colors hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {markingShipping
                ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />Đang cập nhật...</>
                : <><MaterialIcon name="local_shipping" className="text-[18px]" />Bàn giao shipper</>}
            </button>
          )}

          {/* Giao thất bại — SHIPPING + online */}
          {order?.status === 'SHIPPING' && online && (
            <button
              type="button"
              disabled={markingDeliveryFailed}
              onClick={handleMarkDeliveryFailed}
              className="flex items-center gap-sm rounded-lg bg-error px-lg py-sm text-label-md text-on-primary transition-colors hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {markingDeliveryFailed
                ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />Đang cập nhật...</>
                : <><MaterialIcon name="cancel_schedule_send" className="text-[18px]" />Giao thất bại</>}
            </button>
          )}

          {/* Giao lại — chỉ DELIVERY_FAILED + prepaid PayOS */}
          {order?.status === 'DELIVERY_FAILED' && online && isPrepaid && (
            <button
              type="button"
              disabled={redelivering}
              onClick={handleRedeliver}
              className="flex items-center gap-sm rounded-lg bg-tertiary px-lg py-sm text-label-md text-on-primary transition-colors hover:opacity-90 active:scale-95 disabled:opacity-50"
            >
              {redelivering
                ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />Đang cập nhật...</>
                : <><MaterialIcon name="redo" className="text-[18px]" />Giao lại</>}
            </button>
          )}
        </div>
        </div>
      </aside>

      {showExportModal && order && (
        <ExportFormModal order={order} onClose={() => setShowExportModal(false)} />
      )}
      {showCancelModal && order && (
        <CancelOrderModal
          orderId={order.id}
          onClose={() => setShowCancelModal(false)}
          onCancelled={handleCancelled}
        />
      )}
    </>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const StaffOrderManagement = () => {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipping: 0,
    delivered: 0,
    deliveryFailed: 0,
    cancelled: 0,
  });

  const LIMIT = 10;

  const fetchOrders = useCallback(async (p: number, status: string, silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
        setError('');
      }
      const res = await orderService.getStaffOrders({
        page: p,
        limit: LIMIT,
        status: status || undefined,
        orderType: 1,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setOrders(res.data);
      setTotal(res.total);
    } catch {
      if (!silent) setError('Không thể tải danh sách đơn hàng.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [startDate, endDate]);

  // Số liệu tổng quan theo trạng thái — chỉ tính đơn online (orderType = 1).
  const fetchStats = useCallback(async () => {
    try {
      const [all, pending, processing, shipping, delivered, deliveryFailed, cancelled] = await Promise.all([
        orderService.getStaffOrders({ page: 1, limit: 1, orderType: 1 }),
        orderService.getStaffOrders({ page: 1, limit: 1, status: 'PENDING',         orderType: 1 }),
        orderService.getStaffOrders({ page: 1, limit: 1, status: 'PROCESSING',      orderType: 1 }),
        orderService.getStaffOrders({ page: 1, limit: 1, status: 'SHIPPING',        orderType: 1 }),
        orderService.getStaffOrders({ page: 1, limit: 1, status: 'DELIVERED',       orderType: 1 }),
        orderService.getStaffOrders({ page: 1, limit: 1, status: 'DELIVERY_FAILED', orderType: 1 }),
        orderService.getStaffOrders({ page: 1, limit: 1, status: 'CANCELLED',       orderType: 1 }),
      ]);
      setStats({
        total:         all.total,
        pending:       pending.total,
        processing:    processing.total,
        shipping:      shipping.total,
        delivered:     delivered.total,
        deliveryFailed: deliveryFailed.total,
        cancelled:     cancelled.total,
      });
    } catch {
      /* Không chặn danh sách nếu số liệu tổng quan lỗi. */
    }
  }, []);

  useEffect(() => { void fetchOrders(page, statusFilter); }, [fetchOrders, page, statusFilter]);
  useEffect(() => { void fetchStats(); }, [fetchStats]);

  // Đồng bộ ngầm khi backend nhận webhook PayOS hoặc có nhân viên khác cập nhật đơn.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void fetchOrders(page, statusFilter, true);
    }, 5_000);

    return () => window.clearInterval(timer);
  }, [fetchOrders, page, statusFilter]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void fetchStats();
    }, 15_000);

    return () => window.clearInterval(timer);
  }, [fetchStats]);

  const metrics: ProductMetric[] = useMemo(() => [
    {
      label: 'Tổng đơn online', value: stats.total.toString(), icon: 'receipt_long',
      tone: 'primary', meta: 'Tất cả', metaTone: 'neutral',
    },
    {
      label: 'Chờ xử lý', value: stats.pending.toString(), icon: 'pending_actions',
      tone: 'secondary', meta: stats.pending > 0 ? 'Cần xử lý' : 'Đã xử lý hết',
      metaTone: stats.pending > 0 ? 'danger' : 'success',
    },
    {
      label: 'Đang xử lý', value: stats.processing.toString(), icon: 'sync',
      tone: 'secondary', meta: 'Đang chuẩn bị', metaTone: 'neutral',
    },
    {
      label: 'Đang giao', value: stats.shipping.toString(), icon: 'local_shipping',
      tone: 'neutral', meta: 'Vận chuyển', metaTone: 'neutral',
    },
    {
      label: 'Đã giao', value: stats.delivered.toString(), icon: 'check_circle',
      tone: 'success', meta: 'Giao thành công', metaTone: 'success',
    },
    {
      label: 'Giao thất bại', value: stats.deliveryFailed.toString(), icon: 'cancel_schedule_send',
      tone: 'neutral', meta: stats.deliveryFailed > 0 ? 'Cần xử lý' : 'Không có',
      metaTone: stats.deliveryFailed > 0 ? 'danger' : 'neutral',
    },
    {
      label: 'Đã hủy', value: stats.cancelled.toString(), icon: 'cancel',
      tone: 'neutral', meta: 'Bị hủy', metaTone: 'neutral',
    },
  ], [stats]);

  // ─── Filter chips (status) ────────────────────────────────────────────────────
  const STATUS_CHIPS = [
    { value: '',                label: 'Tất cả',         count: stats.total },
    { value: 'PENDING',         label: 'Chờ xử lý',    count: stats.pending },
    { value: 'PROCESSING',      label: 'Đang xử lý',   count: stats.processing },
    { value: 'SHIPPING',        label: 'Đang giao',      count: stats.shipping },
    { value: 'DELIVERED',       label: 'Đã giao',        count: stats.delivered },
    { value: 'DELIVERY_FAILED', label: 'Giao thất bại', count: stats.deliveryFailed },
    { value: 'CANCELLED',       label: 'Đã hủy',         count: stats.cancelled },
  ];

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
        o.customer?.email?.toLowerCase().includes(kw) ||
        o.customer?.phone?.includes(kw),
    );
  }, [orders, search]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <StaffLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          title="Quản lý đơn hàng Online"
          description="Xem và xử lý các đơn hàng đặt trực tuyến."
        />

        {/* ── Stats summary + filter chips ─────────────────────────────── */}
        <div className="rounded-xl border border-slate-border/50 bg-bg-card shadow-sm overflow-hidden">
          {/* Top row: 4 key numbers */}
          <div className="grid grid-cols-2 divide-x divide-slate-border/40 sm:grid-cols-4">
            {[
              { label: 'Tổng đơn',    value: stats.total,         icon: 'receipt_long',        color: 'text-primary' },
              { label: 'Chờ xử lý', value: stats.pending,        icon: 'pending_actions',     color: stats.pending > 0 ? 'text-warning' : 'text-secondary' },
              { label: 'Đang giao',   value: stats.shipping,       icon: 'local_shipping',      color: 'text-tertiary' },
              { label: 'Đã giao',     value: stats.delivered,      icon: 'check_circle',        color: 'text-success' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-sm px-lg py-md">
                <MaterialIcon name={s.icon} className={`text-[22px] ${s.color}`} />
                <div>
                  <p className="text-label-xs text-secondary">{s.label}</p>
                  <p className={`text-headline-md font-bold ${s.color}`}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom row: filter chips */}
          <div className="flex flex-wrap items-center gap-xs border-t border-slate-border/40 px-lg py-sm bg-surface-container-low/50">
            <span className="text-label-xs text-secondary mr-xs">Lọc:</span>
            {STATUS_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => { setStatusFilter(chip.value); setPage(1); }}
                className={`inline-flex items-center gap-xs whitespace-nowrap rounded-full px-sm py-[3px] text-label-xs font-medium transition-colors ${
                  statusFilter === chip.value
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container text-secondary hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {chip.label}
                <span className={`rounded-full px-[5px] py-[1px] text-[10px] font-bold ${
                  statusFilter === chip.value ? 'bg-white/20 text-on-primary' : 'bg-surface-container-highest text-on-surface'
                }`}>
                  {chip.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Search + date range */}
        <div className="flex flex-wrap gap-sm items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <MaterialIcon name="search" className="absolute left-sm top-1/2 -translate-y-1/2 text-secondary text-[18px]" />
            <input
              type="text"
              placeholder="Tìm theo tên, email, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-border/50 bg-bg-card py-sm pl-[36px] pr-md text-body-sm text-on-surface placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center gap-xs rounded-lg border border-slate-border/50 bg-bg-card px-md py-[6px]">
            <MaterialIcon name="calendar_today" className="text-secondary text-[15px]" />
            <span className="text-label-xs text-secondary">Từ</span>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="bg-transparent text-body-sm text-on-surface focus:outline-none cursor-pointer"
            />
            <span className="text-label-xs text-secondary mx-xs">—</span>
            <span className="text-label-xs text-secondary">Đến</span>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="bg-transparent text-body-sm text-on-surface focus:outline-none cursor-pointer"
            />
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
                className="ml-xs text-secondary hover:text-error transition-colors"
                title="Xóa lọc ngày"
              >
                <MaterialIcon name="close" className="text-[14px]" />
              </button>
            )}
          </div>
        </div>

        {error && <div className="rounded-lg bg-error-container p-md text-error">{error}</div>}

        {/* Summary */}
        {!loading && (
          <div className="flex items-center gap-md text-label-xs text-secondary">
            <span>Tổng <strong className="text-on-surface">{total}</strong> đơn online</span>
            {search && <span>· Kết quả lọc: <strong className="text-on-surface">{filtered.length}</strong></span>}
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-border/50 bg-bg-card shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-border/50 bg-surface-container-low">
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Đơn hàng</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Khách hàng</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Ngày đặt</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">SP</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Tổng tiền</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Trạng thái</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">PT thanh toán</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Trạng thái TT</th>
                  <th className="px-lg py-sm" />
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
                          <td colSpan={9} className="py-xl text-center text-secondary">Không có đơn hàng nào.</td>
                    </tr>
                  )
                  : filtered.map((order) => (
                      <tr key={order.id} className="transition-colors hover:bg-surface-container-low">
                        <td className="px-lg py-md">
                          <span className="inline-flex items-center gap-xs rounded-md bg-surface-container-low px-sm py-[3px] font-mono text-label-xs font-semibold text-on-surface/70 ring-1 ring-inset ring-slate-border/40">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-lg py-md">
                          {order.customer ? (
                            <div>
                              <p className="text-body-sm font-medium text-on-surface">{order.customer.name || '—'}</p>
                              <p className="text-label-xs text-secondary">{order.customer.email}</p>
                            </div>
                          ) : (
                            <span className="text-label-xs text-secondary">Vãng lai</span>
                          )}
                        </td>
                        <td className="px-lg py-md text-body-sm text-secondary">{fmtDate(order.orderDate)}</td>
                        <td className="px-lg py-md text-body-sm text-on-surface">{order.itemCount} SP</td>
                        <td className="px-lg py-md text-body-sm font-semibold text-on-surface">{fmt.format(order.totalAmount)}</td>
                        <td className="px-lg py-md"><StatusBadge status={order.status} /></td>
                        <td className="px-lg py-md"><PaymentMethodBadge raw={order.paymentMethod} /></td>
                        <td className="px-lg py-md"><PaymentBadge raw={order.latestPaymentStatus} /></td>
                        <td className="px-lg py-md">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(order.id)}
                            className="flex items-center gap-xs rounded-lg bg-primary/8 px-sm py-xs text-label-xs font-medium text-primary transition-all hover:bg-primary hover:text-on-primary active:scale-95"
                          >
                            <MaterialIcon name="visibility" className="text-[15px]" />
                            Xem
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>

          {!loading && (
            <StaffPagination
              current={page}
              totalPages={totalPages}
              onChange={setPage}
              totalLabel={`Tổng ${total} đơn`}
              showSinglePage
            />
          )}
        </div>
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

export default StaffOrderManagement;

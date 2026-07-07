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

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '',           label: 'Tất cả trạng thái' },
  { value: 'PENDING',    label: 'Chờ xử lý' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SHIPPING',   label: 'Đang giao' },
  { value: 'DELIVERED',  label: 'Đã giao' },
  { value: 'SUCCESSFUL', label: 'Hoàn thành' },
  { value: 'CANCELLED',  label: 'Đã hủy' },
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

/** 1 = Member online, 2 = Guest online, 3 = In-store */
const ORDER_TYPE_OPTIONS = [
  { value: '',        label: 'Tất cả loại đơn' },
  { value: 'online',  label: 'Online' },
  { value: 'instore', label: 'Tại quầy' },
];

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
      <span className="inline-flex items-center gap-xs rounded-full bg-surface-container-highest px-sm py-xs text-label-xs font-medium text-on-surface">
        <MaterialIcon name="storefront" className="text-[12px]" />
        Tại quầy
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-xs rounded-full bg-primary/10 px-sm py-xs text-label-xs font-medium text-primary">
      <MaterialIcon name="public" className="text-[12px]" />
      Online
    </span>
  );
};

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: OrderStatus }) => (
  <span className={`inline-flex items-center rounded-full px-sm py-xs text-label-xs font-medium ${STATUS_STYLE[status]}`}>
    {STATUS_LABEL[status]}
  </span>
);

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
                <div className="flex justify-between">
                  <dt className="text-secondary">Email</dt>
                  <dd className="text-on-surface">{order.customer?.email || '—'}</dd>
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
                <div className="flex justify-between">
                  <dt className="text-secondary">PT thanh toán</dt>
                  <dd className="text-on-surface">{order.paymentMethod || '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-secondary">Hóa đơn VAT</dt>
                  <dd className="text-on-surface">{order.requireInvoice ? 'Có' : 'Không'}</dd>
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

          {/* Ghi chú */}
          {order.note && (
            <section>
              <p className="text-label-xs text-secondary">Ghi chú: <span className="text-on-surface">{order.note}</span></p>
            </section>
          )}

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
                      <div>
                        <dt className="text-label-xs text-secondary">Nhân viên giao</dt>
                        <dd className="text-body-sm text-on-surface">
                          {order.shipper ? `${order.shipper.name}` : 'Chưa phân công'}
                        </dd>
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
                        <dd className="text-body-sm text-on-surface">{order.paymentMethod || '—'}</dd>
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

          {/* Xác nhận đơn — PENDING + online */}
          {order?.status === 'PENDING' && online && confirmStep === 'idle' && (
            <button
              type="button"
              onClick={() => setConfirmStep('prompt')}
              className="flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary transition-colors hover:bg-primary-hover active:scale-95"
            >
              <MaterialIcon name="check_circle" className="text-[18px]" />
              Xác nhận đơn
            </button>
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

          {/* Giao lại — DELIVERY_FAILED + online */}
          {order?.status === 'DELIVERY_FAILED' && online && (
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
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, pending: 0, shipping: 0, successful: 0 });

  const LIMIT = 20;

  const fetchOrders = async (p: number, status: string) => {
    try {
      setLoading(true);
      setError('');
      const res = await orderService.getStaffOrders({ page: p, limit: LIMIT, status: status || undefined });
      setOrders(res.data);
      setTotal(res.total);
    } catch {
      setError('Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  // Số liệu tổng quan theo trạng thái (đọc `total` từ các lệnh đếm nhẹ limit=1).
  const fetchStats = async () => {
    try {
      const [all, pending, shipping, successful] = await Promise.all([
        orderService.getStaffOrders({ page: 1, limit: 1 }),
        orderService.getStaffOrders({ page: 1, limit: 1, status: 'PENDING' }),
        orderService.getStaffOrders({ page: 1, limit: 1, status: 'SHIPPING' }),
        orderService.getStaffOrders({ page: 1, limit: 1, status: 'SUCCESSFUL' }),
      ]);
      setStats({
        total: all.total,
        pending: pending.total,
        shipping: shipping.total,
        successful: successful.total,
      });
    } catch {
      /* Không chặn danh sách nếu số liệu tổng quan lỗi. */
    }
  };

  useEffect(() => { void fetchOrders(page, statusFilter); }, [page, statusFilter]);
  useEffect(() => { void fetchStats(); }, []);

  const metrics: ProductMetric[] = useMemo(() => [
    {
      label: 'Tổng đơn hàng', value: stats.total.toString(), icon: 'receipt_long',
      tone: 'primary', meta: 'Tất cả', metaTone: 'neutral',
    },
    {
      label: 'Chờ xử lý', value: stats.pending.toString(), icon: 'pending_actions',
      tone: 'secondary', meta: stats.pending > 0 ? 'Cần xử lý' : 'Đã xử lý hết',
      metaTone: stats.pending > 0 ? 'danger' : 'success',
    },
    {
      label: 'Đang giao', value: stats.shipping.toString(), icon: 'local_shipping',
      tone: 'neutral', meta: 'Vận chuyển', metaTone: 'neutral',
    },
    {
      label: 'Hoàn thành', value: stats.successful.toString(), icon: 'check_circle',
      tone: 'success', meta: 'Hoàn thành', metaTone: 'success',
    },
  ], [stats]);

  const METRIC_FILTERS = ['', 'PENDING', 'SHIPPING', 'SUCCESSFUL'];

  const handleOrderUpdated = (updated: OrderListItem) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
    void fetchStats();
  };

  const filtered = useMemo(() => {
    let result = orders;
    if (typeFilter === 'online') result = result.filter((o) => isOnlineOrder(o.orderType));
    else if (typeFilter === 'instore') result = result.filter((o) => o.orderType === 2);
    const kw = search.trim().toLowerCase();
    if (kw) result = result.filter(
      (o) =>
        o.id.toLowerCase().includes(kw) ||
        o.customer?.name?.toLowerCase().includes(kw) ||
        o.customer?.email?.toLowerCase().includes(kw) ||
        o.customer?.phone?.includes(kw),
    );
    return result;
  }, [orders, search, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const onlineCount = orders.filter((o) => isOnlineOrder(o.orderType)).length;
  const instoreCount = orders.filter((o) => o.orderType === 2).length;

  return (
    <StaffLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          title="Quản lý đơn hàng"
          description="Xem và xử lý toàn bộ đơn hàng Online và tại quầy."
        />

        {/* Metrics (bấm để lọc nhanh theo trạng thái) */}
        <section className="grid grid-cols-1 gap-lg md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((m, i) => (
            <button
              key={m.label}
              type="button"
              onClick={() => { setStatusFilter(METRIC_FILTERS[i]); setPage(1); }}
              className={`block w-full rounded-xl text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                statusFilter === METRIC_FILTERS[i] ? 'ring-2 ring-primary/60' : ''
              }`}
            >
              <MetricCard metric={m} />
            </button>
          ))}
        </section>

        {/* Secondary filters: search + order type + status */}
        <div className="flex flex-wrap gap-md">
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
          {/* Loại đơn filter */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-border/50 bg-bg-card px-md py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none"
          >
            {ORDER_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {/* Trạng thái (đầy đủ) */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-border/50 bg-bg-card px-md py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {error && <div className="rounded-lg bg-error-container p-md text-error">{error}</div>}

        {/* Summary */}
        {!loading && (
          <div className="flex items-center gap-md text-label-xs text-secondary">
            <span>Tổng <strong className="text-on-surface">{total}</strong> đơn</span>
            <span>·</span>
            <span className="flex items-center gap-xs"><span className="h-2 w-2 rounded-full bg-primary/60" />Online: <strong className="text-on-surface">{onlineCount}</strong></span>
            <span className="flex items-center gap-xs"><span className="h-2 w-2 rounded-full bg-on-surface/30" />Tại quầy: <strong className="text-on-surface">{instoreCount}</strong></span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-border/50 bg-bg-card shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-border/50 bg-surface-container-low">
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Đơn hàng</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Loại</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Khách hàng</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Ngày đặt</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">SP</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Tổng tiền</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Trạng thái</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Thanh toán</th>
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
                          <span className="font-mono text-label-xs text-secondary">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                        </td>
                        <td className="px-lg py-md"><OrderTypeBadge orderType={order.orderType} /></td>
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
                        <td className="px-lg py-md text-label-xs text-secondary">{paymentStatusLabel(order.latestPaymentStatus)}</td>
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

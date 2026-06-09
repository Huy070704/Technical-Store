import { useEffect, useMemo, useRef, useState } from 'react';
import { StaffLayout } from '@/components/staff';
import PageHeader from '@/components/admin/shared/PageHeader';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import { orderService } from '@/services/orderService';
import type { OrderDetail, OrderListItem, OrderStatus } from '@/types/order';

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'SHIPPING,DELIVERED', label: 'Tất cả' },
  { value: 'SHIPPING',           label: 'Đang giao' },
  { value: 'DELIVERED',          label: 'Đã giao' },
];

const STATUS_STYLE: Record<string, string> = {
  SHIPPING:  'bg-tertiary-fixed text-tertiary',
  DELIVERED: 'bg-tertiary/10 text-tertiary',
};

const STATUS_LABEL: Record<string, string> = {
  SHIPPING:  'Đang giao',
  DELIVERED: 'Đã giao',
};

const PAYMENT_METHODS = [
  { value: 'CASH',         label: 'Tiền mặt' },
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản' },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const calcPaid = (order: OrderDetail) =>
  order.payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);

const calcRemaining = (order: OrderDetail) =>
  Math.max(0, order.totalAmount - calcPaid(order));

// ─── StatusBadge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center rounded-full px-sm py-xs text-label-xs font-medium ${STATUS_STYLE[status] ?? 'bg-surface-container-highest text-on-surface'}`}>
    {STATUS_LABEL[status] ?? status}
  </span>
);

// ─── InvoiceModal ─────────────────────────────────────────────────────────────

const InvoiceModal = ({ order, onClose }: { order: OrderDetail; onClose: () => void }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const invoice = order.invoices[order.invoices.length - 1] ?? null;

  const handlePrint = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Hóa đơn giao hàng - ${invoice?.invoiceNumber ?? ''}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #f4f4f4; text-align: left; padding: 8px 12px; font-size: 13px; border-bottom: 2px solid #ddd; }
        td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #eee; }
        .footer { margin-top: 40px; display: flex; justify-content: space-between; }
        .sig { text-align: center; font-size: 13px; color: #666; }
        .sig div { margin-top: 48px; border-top: 1px solid #999; padding-top: 4px; width: 140px; }
      </style></head><body>${printRef.current.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 z-[70] max-h-[90vh] w-full max-w-2xl -translate-y-1/2 overflow-y-auto rounded-2xl bg-bg-card shadow-2xl mx-auto">
        <div className="flex items-center justify-between border-b border-slate-border/50 px-lg py-md">
          <div className="flex items-center gap-sm">
            <MaterialIcon name="receipt_long" className="text-primary" />
            <h2 className="text-headline-lg font-bold text-on-surface">Hóa đơn giao hàng</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-xs text-secondary hover:bg-surface-container-low">
            <MaterialIcon name="close" />
          </button>
        </div>

        <div ref={printRef} className="p-lg space-y-lg">
          <div>
            <h1 className="text-headline-xl font-bold text-on-surface">HÓA ĐƠN GIAO HÀNG</h1>
            <p className="text-label-xs text-secondary">
              {invoice?.invoiceNumber ?? '—'} &nbsp;·&nbsp; {fmtDateTime(order.orderDate)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-md text-body-sm">
            <div className="space-y-xs">
              <p className="text-label-xs font-semibold text-on-surface uppercase tracking-wide">Khách hàng</p>
              <p>{order.customer?.name || 'Khách vãng lai'}</p>
              <p className="text-secondary">{order.customer?.phone || '—'}</p>
              <p className="text-secondary">{order.customer?.email || '—'}</p>
            </div>
            <div className="space-y-xs">
              <p className="text-label-xs font-semibold text-on-surface uppercase tracking-wide">Giao hàng</p>
              <p className="text-secondary">{order.shippingAddress || '—'}</p>
              <p>PT thanh toán: <span className="font-medium">{order.paymentMethod || '—'}</span></p>
              <p>Hóa đơn VAT: <span className="font-medium">{order.requireInvoice ? 'Có' : 'Không'}</span></p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-border/50">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-md py-sm text-left text-label-xs text-secondary">Sản phẩm</th>
                  <th className="px-md py-sm text-right text-label-xs text-secondary">Đơn giá</th>
                  <th className="px-md py-sm text-right text-label-xs text-secondary">SL</th>
                  <th className="px-md py-sm text-right text-label-xs text-secondary">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-border/30">
                {order.items.map((item) => (
                  <tr key={item.productId}>
                    <td className="px-md py-sm text-body-sm text-on-surface">{item.productName}</td>
                    <td className="px-md py-sm text-right text-body-sm">{fmt.format(item.unitPrice)}</td>
                    <td className="px-md py-sm text-right text-body-sm font-semibold">{item.quantity}</td>
                    <td className="px-md py-sm text-right text-body-sm font-semibold">{fmt.format(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-border/50 bg-surface-container-low">
                  <td colSpan={3} className="px-md py-sm text-label-md font-bold text-on-surface">Tổng cộng</td>
                  <td className="px-md py-sm text-right text-label-md font-bold text-primary">{fmt.format(order.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {invoice && (
            <div className={`flex items-center gap-sm rounded-lg px-md py-sm text-label-sm ${invoice.status === 'PAID' ? 'bg-tertiary/10 text-tertiary' : 'bg-warning/10 text-warning'}`}>
              <MaterialIcon name={invoice.status === 'PAID' ? 'check_circle' : 'pending'} className="text-[16px]" />
              {invoice.status === 'PAID' ? 'Đã thanh toán đầy đủ' : 'Chưa thanh toán đầy đủ'}
              {invoice.paidAt && ` — ${fmtDateTime(invoice.paidAt)}`}
            </div>
          )}

          <div className="flex justify-between pt-md">
            <div className="text-center text-label-xs text-secondary">
              <p className="font-medium text-on-surface">Khách hàng</p>
              <div className="mt-[48px] border-t border-slate-border pt-xs w-32">(Ký tên)</div>
            </div>
            <div className="text-center text-label-xs text-secondary">
              <p className="font-medium text-on-surface">Nhân viên giao</p>
              <div className="mt-[48px] border-t border-slate-border pt-xs w-32">(Ký tên)</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-md border-t border-slate-border/50 px-lg py-md">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-border/50 px-lg py-sm text-label-md text-secondary hover:bg-surface-container-low">
            Đóng
          </button>
          <button type="button" onClick={handlePrint} className="flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary hover:bg-primary-hover">
            <MaterialIcon name="print" className="text-[18px]" />
            In hóa đơn
          </button>
        </div>
      </div>
    </>
  );
};

// ─── DeliveryDetailDrawer ─────────────────────────────────────────────────────

const DeliveryDetailDrawer = ({
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
  const [showInvoice, setShowInvoice] = useState(false);

  // Thu tiền state
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [collecting, setCollecting] = useState(false);
  const [collectError, setCollectError] = useState('');

  // Confirm delivery state
  const [deliverStep, setDeliverStep] = useState<'idle' | 'prompt'>('idle');
  const [delivering, setDelivering] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    setDeliverStep('idle');
    setCollectError('');
    orderService
      .getStaffOrderById(orderId)
      .then((o) => {
        setOrder(o);
        setPayAmount(String(Math.max(0, o.totalAmount - o.payments.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0))));
      })
      .catch(() => setError('Không thể tải thông tin đơn hàng.'))
      .finally(() => setLoading(false));
  }, [orderId]);

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
    });
  };

  const handleCollect = async () => {
    if (!order) return;
    const amount = parseFloat(payAmount);
    if (isNaN(amount) || amount <= 0) { setCollectError('Vui lòng nhập số tiền hợp lệ.'); return; }
    try {
      setCollecting(true);
      setCollectError('');
      const updated = await orderService.collectPayment(order.id, { amount, method: payMethod });
      setOrder(updated);
      setPayAmount(String(calcRemaining(updated)));
      propagate(updated);
    } catch (e: any) {
      setCollectError(e?.response?.data?.message ?? 'Thu tiền thất bại.');
    } finally {
      setCollecting(false);
    }
  };

  const handleDeliver = async () => {
    if (!order) return;
    try {
      setDelivering(true);
      const updated = await orderService.staffConfirmDelivery(order.id);
      setOrder(updated);
      setDeliverStep('idle');
      setShowInvoice(true);
      propagate(updated);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Xác nhận giao hàng thất bại.');
    } finally {
      setDelivering(false);
    }
  };

  const remaining = order ? calcRemaining(order) : 0;
  const paid = order ? calcPaid(order) : 0;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-5xl flex-col bg-bg-card shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-slate-border/50 px-lg py-md">
          <div className="flex items-center gap-lg">
            <div>
              <h2 className="text-headline-lg font-bold text-on-surface">Chi tiết giao hàng</h2>
              {order && (
                <p className="text-label-xs text-secondary">
                  #{order.id.slice(0, 8).toUpperCase()} · {fmtDate(order.orderDate)}
                </p>
              )}
            </div>
            {order && <StatusBadge status={order.status} />}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-xs text-secondary hover:bg-surface-container-low hover:text-on-surface">
            <MaterialIcon name="close" />
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-lg">
          {loading && <div className="flex h-48 items-center justify-center text-secondary">Đang tải...</div>}

          {error && (
            <div className="flex items-center gap-sm rounded-lg bg-error-container p-md text-error">
              <MaterialIcon name="error" className="text-[18px]" />
              {error}
            </div>
          )}

          {order && !loading && (
            <div className="space-y-md">

              {/* Confirm delivery prompt */}
              {deliverStep === 'prompt' && order.status === 'SHIPPING' && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-md space-y-sm">
                  <p className="text-body-sm font-medium text-on-surface">
                    Xác nhận đã giao thành công đơn #{order.id.slice(0, 8).toUpperCase()}?
                  </p>
                  <p className="text-label-xs text-secondary">
                    Trạng thái chuyển sang <strong>Đã giao</strong>. Hóa đơn giao hàng sẽ được tạo tự động.
                  </p>
                  {remaining > 0 && (
                    <div className="flex items-center gap-xs rounded-lg bg-warning/10 px-sm py-xs text-label-xs text-warning">
                      <MaterialIcon name="warning" className="text-[14px]" />
                      Còn {fmt.format(remaining)} chưa thu — hóa đơn sẽ ở trạng thái Chưa thanh toán.
                    </div>
                  )}
                  <div className="flex gap-sm">
                    <button
                      type="button"
                      disabled={delivering}
                      onClick={handleDeliver}
                      className="flex items-center gap-xs rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary hover:bg-primary-hover disabled:opacity-50"
                    >
                      {delivering
                        ? <MaterialIcon name="hourglass_empty" className="animate-spin text-[16px]" />
                        : <MaterialIcon name="check" className="text-[16px]" />}
                      {delivering ? 'Đang xử lý...' : 'Xác nhận'}
                    </button>
                    <button
                      type="button"
                      disabled={delivering}
                      onClick={() => setDeliverStep('idle')}
                      className="rounded-lg border border-slate-border/50 px-lg py-sm text-label-md text-secondary hover:bg-surface-container-low"
                    >
                      Hủy bỏ
                    </button>
                  </div>
                </div>
              )}

              {/* 2-column layout */}
              <div className="grid grid-cols-1 gap-md lg:grid-cols-2">

                {/* ── Cột trái ─────────────────────────── */}
                <div className="space-y-md">

                  {/* Khách hàng */}
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
                          <dt className="text-label-xs text-secondary">Địa chỉ giao</dt>
                          <dd className="text-body-sm text-on-surface">{order.shippingAddress || '—'}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="text-body-sm text-secondary">Khách vãng lai</p>
                    )}
                  </section>

                  {/* Tổng quan thanh toán */}
                  <section className="rounded-xl border border-slate-border/50 bg-bg-base p-md space-y-sm">
                    <h3 className="flex items-center gap-sm text-label-md font-semibold text-on-surface">
                      <MaterialIcon name="payments" className="text-primary text-[18px]" />
                      Thanh toán
                    </h3>
                    <div className="grid grid-cols-3 gap-xs">
                      <div className="rounded-lg bg-surface-container-low p-sm text-center">
                        <p className="text-label-xs text-secondary">Tổng đơn</p>
                        <p className="text-body-sm font-bold text-on-surface">{fmt.format(order.totalAmount)}</p>
                      </div>
                      <div className="rounded-lg bg-tertiary/10 p-sm text-center">
                        <p className="text-label-xs text-secondary">Đã thu</p>
                        <p className="text-body-sm font-bold text-tertiary">{fmt.format(paid)}</p>
                      </div>
                      <div className={`rounded-lg p-sm text-center ${remaining > 0 ? 'bg-warning/10' : 'bg-tertiary/10'}`}>
                        <p className="text-label-xs text-secondary">Còn lại</p>
                        <p className={`text-body-sm font-bold ${remaining > 0 ? 'text-warning' : 'text-tertiary'}`}>
                          {fmt.format(remaining)}
                        </p>
                      </div>
                    </div>

                    {order.payments.length > 0 && (
                      <ul className="divide-y divide-slate-border/30">
                        {order.payments.map((p, i) => (
                          <li key={i} className="flex justify-between py-xs text-label-xs">
                            <span className="text-secondary">{p.method} · {p.status}</span>
                            <span className="font-medium text-on-surface">{fmt.format(p.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  {/* Thu tiền còn lại — chỉ khi SHIPPING và còn tiền */}
                  {order.status === 'SHIPPING' && remaining > 0 && (
                    <section className="rounded-xl border border-warning/40 bg-warning/5 p-md space-y-sm">
                      <h3 className="flex items-center gap-sm text-label-md font-semibold text-on-surface">
                        <MaterialIcon name="point_of_sale" className="text-warning text-[18px]" />
                        Thu tiền còn lại
                      </h3>
                      <div className="grid grid-cols-2 gap-sm">
                        <div>
                          <label className="mb-xs block text-label-xs text-secondary">Số tiền (VND)</label>
                          <input
                            type="number"
                            min={1}
                            max={remaining}
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            className="w-full rounded-lg border border-slate-border/50 bg-bg-card px-sm py-xs text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
                          />
                        </div>
                        <div>
                          <label className="mb-xs block text-label-xs text-secondary">Phương thức</label>
                          <select
                            value={payMethod}
                            onChange={(e) => setPayMethod(e.target.value)}
                            className="w-full rounded-lg border border-slate-border/50 bg-bg-card px-sm py-xs text-body-sm text-on-surface focus:border-primary focus:outline-none"
                          >
                            {PAYMENT_METHODS.map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {collectError && (
                        <p className="text-label-xs text-error">{collectError}</p>
                      )}
                      <button
                        type="button"
                        disabled={collecting}
                        onClick={handleCollect}
                        className="flex items-center gap-sm rounded-lg bg-warning px-lg py-sm text-label-md text-white transition-colors hover:opacity-90 disabled:opacity-50"
                      >
                        {collecting
                          ? <MaterialIcon name="hourglass_empty" className="animate-spin text-[16px]" />
                          : <MaterialIcon name="point_of_sale" className="text-[16px]" />}
                        {collecting ? 'Đang xử lý...' : 'Xác nhận thu tiền'}
                      </button>
                    </section>
                  )}

                  {/* Đã thu đủ badge */}
                  {order.status === 'SHIPPING' && remaining <= 0 && (
                    <div className="flex items-center gap-sm rounded-xl border border-tertiary/30 bg-tertiary/10 p-md text-label-sm text-tertiary">
                      <MaterialIcon name="check_circle" className="text-[18px]" />
                      Đã thu đủ tiền hàng
                    </div>
                  )}

                  {/* Invoice info khi DELIVERED */}
                  {order.status === 'DELIVERED' && order.invoices.length > 0 && (
                    <section className="rounded-xl border border-slate-border/50 bg-bg-base p-md space-y-sm">
                      <h3 className="flex items-center gap-sm text-label-md font-semibold text-on-surface">
                        <MaterialIcon name="receipt_long" className="text-primary text-[18px]" />
                        Hóa đơn
                      </h3>
                      {order.invoices.map((inv, i) => (
                        <div key={i} className="flex items-center justify-between text-body-sm">
                          <div>
                            <p className="font-medium text-on-surface">{inv.invoiceNumber ?? '—'}</p>
                            <p className="text-label-xs text-secondary">{inv.paidAt ? fmtDateTime(inv.paidAt) : '—'}</p>
                          </div>
                          <span className={`rounded-full px-sm py-xs text-label-xs font-medium ${inv.status === 'PAID' ? 'bg-tertiary/10 text-tertiary' : 'bg-warning/10 text-warning'}`}>
                            {inv.status === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                          </span>
                        </div>
                      ))}
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

        {/* footer */}
        <div className="flex items-center justify-end gap-md border-t border-slate-border/50 px-lg py-md">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-border/50 px-lg py-sm text-label-md text-secondary hover:bg-surface-container-low">
            Đóng
          </button>

          {order?.status === 'DELIVERED' && order.invoices.length > 0 && (
            <button
              type="button"
              onClick={() => setShowInvoice(true)}
              className="flex items-center gap-sm rounded-lg border border-primary/50 px-lg py-sm text-label-md text-primary hover:bg-primary/5"
            >
              <MaterialIcon name="receipt_long" className="text-[18px]" />
              Xem hóa đơn
            </button>
          )}

          {order?.status === 'SHIPPING' && deliverStep === 'idle' && (
            <button
              type="button"
              onClick={() => setDeliverStep('prompt')}
              className="flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary hover:bg-primary-hover active:scale-95"
            >
              <MaterialIcon name="verified" className="text-[18px]" />
              Xác nhận giao thành công
            </button>
          )}
        </div>
      </aside>

      {showInvoice && order && (
        <InvoiceModal order={order} onClose={() => setShowInvoice(false)} />
      )}
    </>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const StaffDeliveryManagement = () => {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('SHIPPING,DELIVERED');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const LIMIT = 20;

  const fetchOrders = async (p: number, status: string) => {
    try {
      setLoading(true);
      setError('');
      const res = await orderService.getStaffOrders({ page: p, limit: LIMIT, status });
      setOrders(res.data);
      setTotal(res.total);
    } catch {
      setError('Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchOrders(page, statusFilter); }, [page, statusFilter]);

  const handleOrderUpdated = (updated: OrderListItem) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(kw) ||
        o.customer?.name?.toLowerCase().includes(kw) ||
        o.customer?.phone?.includes(kw) ||
        o.shippingAddress?.toLowerCase().includes(kw),
    );
  }, [orders, search]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <StaffLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          title="Quản lý giao hàng"
          description="Theo dõi và xử lý các đơn hàng đang trên đường giao đến khách."
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-md">
          <div className="relative flex-1 min-w-[200px]">
            <MaterialIcon name="search" className="absolute left-sm top-1/2 -translate-y-1/2 text-secondary text-[18px]" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, địa chỉ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-border/50 bg-bg-card py-sm pl-[36px] pr-md text-body-sm text-on-surface placeholder:text-secondary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-border/50 bg-bg-card px-md py-sm text-body-sm text-on-surface focus:border-primary focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {error && <div className="rounded-lg bg-error-container p-md text-error">{error}</div>}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-slate-border/50 bg-bg-card shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-border/50 bg-surface-container-low">
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Đơn hàng</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Khách hàng</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Địa chỉ giao</th>
                  <th className="px-lg py-sm text-right text-label-md text-secondary">Tổng tiền</th>
                  <th className="px-lg py-sm text-left text-label-md text-secondary">Trạng thái</th>
                  <th className="px-lg py-sm" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-border/30">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j} className="px-lg py-md">
                            <div className="h-4 rounded bg-surface-container-highest" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="py-xl text-center text-secondary">Không có đơn nào.</td>
                    </tr>
                  )
                  : filtered.map((order) => (
                      <tr key={order.id} className="transition-colors hover:bg-surface-container-low">
                        <td className="px-lg py-md">
                          <span className="font-mono text-label-xs text-secondary">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <p className="text-label-xs text-secondary">{fmtDate(order.orderDate)}</p>
                        </td>
                        <td className="px-lg py-md">
                          {order.customer ? (
                            <div>
                              <p className="text-body-sm font-medium text-on-surface">{order.customer.name || '—'}</p>
                              <p className="text-label-xs text-secondary">{order.customer.phone || order.customer.email}</p>
                            </div>
                          ) : (
                            <span className="text-label-xs text-secondary">Vãng lai</span>
                          )}
                        </td>
                        <td className="px-lg py-md max-w-[200px]">
                          <p className="truncate text-body-sm text-on-surface">{order.shippingAddress || '—'}</p>
                        </td>
                        <td className="px-lg py-md text-right text-body-sm font-semibold text-on-surface">
                          {fmt.format(order.totalAmount)}
                        </td>
                        <td className="px-lg py-md">
                          <StatusBadge status={order.status as OrderStatus} />
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
                    ))}
              </tbody>
            </table>
          </div>

          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-border/50 px-lg py-md">
              <span className="text-label-xs text-secondary">Tổng {total} đơn · Trang {page}/{totalPages}</span>
              <div className="flex gap-xs">
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border border-slate-border/50 px-md py-xs text-label-xs text-secondary hover:bg-surface-container-low disabled:opacity-40">
                  Trước
                </button>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-border/50 px-md py-xs text-label-xs text-secondary hover:bg-surface-container-low disabled:opacity-40">
                  Tiếp
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedOrderId && (
        <DeliveryDetailDrawer
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
          onOrderUpdated={handleOrderUpdated}
        />
      )}
    </StaffLayout>
  );
};

export default StaffDeliveryManagement;

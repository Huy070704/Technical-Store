import { useEffect, useMemo, useRef, useState } from 'react';
import { StaffLayout } from '@/components/staff';
import PageHeader from '@/components/admin/shared/PageHeader';
import MaterialIcon from '@/components/admin/shared/MaterialIcon';
import { orderService } from '@/services/orderService';
import type { OrderDetail, OrderListItem, OrderStatus } from '@/types/order';

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'ASSIGNED', label: 'Đã phân công' },
  { value: 'PROCESSING', label: 'Đang xử lý' },
  { value: 'SHIPPING', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'RETURNED', label: 'Hoàn hàng' },
];

const STATUS_STYLE: Record<OrderStatus, string> = {
  PENDING:    'bg-warning/10 text-warning',
  ASSIGNED:   'bg-primary-light text-primary',
  PROCESSING: 'bg-secondary-fixed text-secondary',
  SHIPPING:   'bg-tertiary-fixed text-tertiary',
  DELIVERED:  'bg-tertiary/10 text-tertiary',
  CANCELLED:  'bg-error-container text-error',
  RETURNED:   'bg-surface-container-highest text-on-surface',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING:    'Chờ xử lý',
  ASSIGNED:   'Đã phân công',
  PROCESSING: 'Đang xử lý',
  SHIPPING:   'Đang giao',
  DELIVERED:  'Đã giao',
  CANCELLED:  'Đã hủy',
  RETURNED:   'Hoàn hàng',
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

// ─── ExportFormModal ──────────────────────────────────────────────────────────

const ExportFormModal = ({
  order,
  onClose,
}: {
  order: OrderDetail;
  onClose: () => void;
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Phiếu xuất kho - ${order.id.slice(0, 8).toUpperCase()}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #1a1a1a; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .sub { color: #666; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #f4f4f4; text-align: left; padding: 8px 12px; font-size: 13px; border-bottom: 2px solid #ddd; }
        td { padding: 8px 12px; font-size: 13px; border-bottom: 1px solid #eee; }
        .total-row td { font-weight: bold; border-top: 2px solid #ddd; }
        .info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; font-size: 13px; }
        .info dt { color: #666; }
        .info dd { font-weight: 500; }
        .footer { margin-top: 40px; display: flex; justify-content: flex-end; }
        .sig { text-align: center; font-size: 13px; color: #666; }
        .sig div { margin-top: 48px; border-top: 1px solid #999; padding-top: 4px; width: 140px; }
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
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
            <MaterialIcon name="print" className="text-[18px]" />
            In phiếu xuất
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

  useEffect(() => {
    setLoading(true);
    setError('');
    setConfirmStep('idle');
    orderService
      .getStaffOrderById(orderId)
      .then(setOrder)
      .catch(() => setError('Không thể tải thông tin đơn hàng.'))
      .finally(() => setLoading(false));
  }, [orderId]);

  const handleConfirm = async () => {
    if (!order) return;
    try {
      setConfirming(true);
      const updated = await orderService.confirmOrder(order.id);
      setOrder(updated);
      setConfirmStep('idle');
      // propagate list update
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
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Xác nhận đơn hàng thất bại.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* drawer — wide panel */}
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-5xl flex-col bg-bg-card shadow-2xl">
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
            {order && <StatusBadge status={order.status} />}
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
                        <dd className="text-body-sm text-on-surface">{order.latestPaymentStatus || '—'}</dd>
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
        <div className="flex items-center justify-end gap-md border-t border-slate-border/50 px-lg py-md">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-border/50 px-lg py-sm text-label-md text-secondary transition-colors hover:bg-surface-container-low"
          >
            Đóng
          </button>

          {order?.status === 'PENDING' && confirmStep === 'idle' && (
            <button
              type="button"
              onClick={() => setConfirmStep('prompt')}
              className="flex items-center gap-sm rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary transition-colors hover:bg-primary-hover active:scale-95"
            >
              <MaterialIcon name="check_circle" className="text-[18px]" />
              Xác nhận đơn hàng
            </button>
          )}

          {order?.status === 'PROCESSING' && (
            <button
              type="button"
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-sm rounded-lg bg-tertiary px-lg py-sm text-label-md text-on-primary transition-colors hover:opacity-90 active:scale-95"
            >
              <MaterialIcon name="output" className="text-[18px]" />
              Tạo phiếu xuất kho
            </button>
          )}
        </div>
      </aside>

      {/* Export form modal — rendered outside drawer */}
      {showExportModal && order && (
        <ExportFormModal order={order} onClose={() => setShowExportModal(false)} />
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

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

  useEffect(() => { void fetchOrders(page, statusFilter); }, [page, statusFilter]);

  // Khi drawer confirm xong → cập nhật row trong bảng ngay
  const handleOrderUpdated = (updated: OrderListItem) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
  };

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    if (!kw) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(kw) ||
        o.customer?.name.toLowerCase().includes(kw) ||
        o.customer?.email.toLowerCase().includes(kw) ||
        o.customer?.phone?.includes(kw),
    );
  }, [orders, search]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <StaffLayout>
      <div className="mx-auto max-w-7xl space-y-lg">
        <PageHeader
          title="Quản lý đơn hàng Online"
          description="Xem, xác nhận và xử lý các đơn hàng đặt trực tuyến của khách hàng."
        />

        {/* Filters */}
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
                        {Array.from({ length: 8 }).map((__, j) => (
                          <td key={j} className="px-lg py-md">
                            <div className="h-4 rounded bg-surface-container-highest" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={8} className="py-xl text-center text-secondary">Không có đơn hàng nào.</td>
                    </tr>
                  )
                  : filtered.map((order) => (
                      <tr key={order.id} className="transition-colors hover:bg-surface-container-low">
                        <td className="px-lg py-md">
                          <span className="font-mono text-label-xs text-secondary">
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
                        <td className="px-lg py-md text-label-xs text-secondary">{order.latestPaymentStatus || '—'}</td>
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
                  className="rounded-lg border border-slate-border/50 px-md py-xs text-label-xs text-secondary transition-colors hover:bg-surface-container-low disabled:opacity-40">
                  Trước
                </button>
                <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-border/50 px-md py-xs text-label-xs text-secondary transition-colors hover:bg-surface-container-low disabled:opacity-40">
                  Tiếp
                </button>
              </div>
            </div>
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

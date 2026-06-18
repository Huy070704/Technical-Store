import { useMemo, useState } from 'react';
import {
  FileDown,
  Package,
  Search,
  ShoppingBag,
  Truck,
  X,
  MapPin,
  CreditCard,
  Receipt,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { paymentService } from '@/services/paymentService';
import { useInvoiceExport } from '@/hooks/useInvoiceExport';
import { useOrders } from '@/hooks/useOrders';
import { cart } from '@/styles/cartClasses';
import { formatVnd } from '@/utils/cartFormat';
import { formatDateTime } from '@/utils/dateFormatter';
import type { Order, OrderStatistics } from '@/types/order';

interface OrderHistoryProps {
  orders: Order[];
  statistics: OrderStatistics | null;
  onOrderUpdate: (orders: Order[]) => void;
  currentPage: number;
  totalPages: number;
  totalOrders: number;
  onPageChange: (page: number) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

const statusLabel: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  ASSIGNED: 'Đã phân công',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Trả hàng',
};

const filterInputClass =
  'w-full rounded-lg border border-slate-border bg-bg-card px-3 py-2 text-body-sm text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10';

export const OrderHistory = ({
  orders,
  statistics,
  onOrderUpdate,
  currentPage,
  totalPages,
  totalOrders,
  onPageChange,
  statusFilter,
  onStatusFilterChange,
}: OrderHistoryProps) => {
  const { cancelOrder, loading: cancelLoading, error: cancelApiError } = useOrders();
  const { exportToPDF } = useInvoiceExport();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [cancelModal, setCancelModal] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const hasActiveFilters =
    statusFilter !== 'all' ||
    searchQuery.trim().length > 0 ||
    !!startDate ||
    !!endDate;

  // cancelApiError từ useOrders (server error khi hủy đơn)
  const displayCancelError = cancelError || cancelApiError || '';

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        if (statusFilter !== 'all' && order.status !== statusFilter) {
          return false;
        }

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const orderId = order.id.toLowerCase();
          const productMatch =
            order.orderDetails?.some((detail) =>
              detail.product?.name?.toLowerCase().includes(query),
            ) ?? false;
          if (!orderId.includes(query) && !productMatch) return false;
        }

        if (startDate) {
          const orderDate = new Date(order.orderDate);
          const start = new Date(startDate);
          if (orderDate < start) return false;
        }

        if (endDate) {
          const orderDate = new Date(order.orderDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (orderDate > end) return false;
        }

        return true;
      }),
    [orders, statusFilter, searchQuery, startDate, endDate],
  );

  const clearFilters = () => {
    onStatusFilterChange('all');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isPayosPending = (order: Order) =>
    order.paymentMethod === 'ONLINE' &&
    order.payments?.some((p) => p.method === 'PAYOS' && p.status === 'pending');

  const canExportInvoice = (order: Order) =>
    order.requireInvoice && order.status !== 'CANCELLED';

  const handlePayAgain = async (order: Order) => {
    setPayingId(order.id);
    try {
      const url = await paymentService.createPayosLink(order.id);
      window.location.href = url;
    } catch (err) {
      alert(
        err instanceof Error ? err.message : 'Không tạo được link thanh toán',
      );
      setPayingId(null);
    }
  };

  const handleCancel = async () => {
    if (!cancelModal) return;
    const reason = cancelReason.trim();
    if (reason.length < 10) {
      setCancelError('Lý do hủy phải từ 10–200 ký tự');
      return;
    }
    if (reason.length > 200) {
      setCancelError('Lý do hủy không được vượt quá 200 ký tự');
      return;
    }

    try {
      const updated = await cancelOrder(cancelModal, reason);
      onOrderUpdate(orders.map((o) => (o.id === updated.id ? updated : o)));
      setCancelModal(null);
      setCancelReason('');
      setCancelError('');
    } catch {
      /* error shown via hook */
    }
  };

  const statCards = statistics
    ? [
        {
          label: 'Tổng đơn',
          value: statistics.total,
          icon: ShoppingBag,
          color: 'text-primary bg-primary-light',
        },
        {
          label: 'Chờ xử lý',
          value: statistics.pending,
          icon: Package,
          color: 'text-warning bg-warning/10',
        },
        {
          label: 'Đang giao',
          value: statistics.shipping,
          icon: Truck,
          color: 'text-tertiary bg-tertiary/10',
        },
        {
          label: 'Đã giao',
          value: statistics.delivered,
          icon: Package,
          color: 'text-secondary bg-secondary-container/40',
        },
        {
          label: 'Đã hủy',
          value: statistics.cancelled,
          icon: X,
          color: 'text-error bg-error/10',
        },
      ]
    : [];

  return (
    <div className={cart.pageShell}>
      <h1 className="mb-2 text-headline-lg text-on-surface">Lịch sử đơn hàng</h1>
      <p className="mb-6 text-body-sm text-secondary">
        Tổng {totalOrders} đơn hàng trong hệ thống
      </p>

      {statistics && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-xl border border-slate-border/80 bg-bg-card p-4 shadow-card"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg ${color}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-label-xs text-secondary">{label}</span>
              </div>
              <p className="text-xl font-bold tabular-nums text-on-surface">
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-slate-border bg-bg-card p-4 shadow-card md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-body-md font-semibold text-on-surface">
            <Search className="h-4 w-4 text-primary" />
            Tìm đơn hàng
          </h2>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg bg-error px-3 py-1.5 text-label-xs font-semibold text-white"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-label-xs text-secondary">
              Trạng thái
            </label>
            <select
              className={filterInputClass}
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="PENDING">Chờ xử lý</option>
              <option value="SHIPPING">Đang giao</option>
              <option value="DELIVERED">Đã giao</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-label-xs text-secondary">
              Tìm kiếm
            </label>
            <input
              type="text"
              className={filterInputClass}
              placeholder="Mã đơn, tên sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-label-xs text-secondary">
              Từ ngày
            </label>
            <input
              type="date"
              className={filterInputClass}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-label-xs text-secondary">
              Đến ngày
            </label>
            <input
              type="date"
              className={filterInputClass}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <p className="mt-3 text-label-xs text-secondary">
            Hiển thị {filteredOrders.length} đơn trên trang {currentPage}
          </p>
        )}
      </div>

      {filteredOrders.length === 0 ? (
        <p className="text-body-sm text-secondary">
          {hasActiveFilters
            ? 'Không có đơn nào khớp bộ lọc trên trang này.'
            : 'Chưa có đơn hàng nào.'}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-slate-border/80 bg-bg-card p-4 shadow-card"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => toggleExpand(order.id)}
              >
                <div>
                  <p className="font-semibold text-on-surface">
                    #{order.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-body-sm text-secondary">
                    {formatDateTime(order.orderDate)} ·{' '}
                    {statusLabel[order.status] ?? order.status}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-primary">
                    {formatVnd(Number(order.totalAmount))}
                  </span>
                  {expanded.has(order.id) ? (
                    <ChevronUp className="h-5 w-5 text-secondary transition-transform" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-secondary transition-transform" />
                  )}
                </div>
              </button>

              {expanded.has(order.id) && (
                <div className="mt-5 border-t border-slate-border/60 pt-5 text-body-sm">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
                    
                    {/* Left Column: Delivery & Products */}
                    <div className="flex flex-col gap-5">
                      
                      {/* Shipping & Payment Info Grid */}
                      <div className="grid grid-cols-1 gap-4 rounded-xl bg-surface-container-low/40 p-4 border border-slate-border/50 sm:grid-cols-2">
                        <div className="flex gap-3">
                          <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div className="flex flex-col gap-0.5 text-left">
                            <span className="text-label-xs font-bold uppercase tracking-wider text-secondary">
                              Địa chỉ nhận hàng
                            </span>
                            <span className="text-body-sm font-medium text-on-surface">
                              {order.shippingAddress}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3.5">
                          <div className="flex gap-3">
                            <CreditCard className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="text-label-xs font-bold uppercase tracking-wider text-secondary">
                                Thanh toán
                              </span>
                              <span className="text-body-sm font-medium text-on-surface">
                                {order.paymentMethod === 'ONLINE' ? 'Chuyển khoản trực tuyến (PayOS)' : 'Thanh toán COD'}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <Receipt className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="text-label-xs font-bold uppercase tracking-wider text-secondary">
                                Yêu cầu hóa đơn VAT
                              </span>
                              <span className="text-body-sm font-medium text-on-surface">
                                {order.requireInvoice ? 'Có (Xuất hóa đơn)' : 'Không'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Product items list */}
                      <div className="flex flex-col gap-3">
                        <span className="text-label-xs font-bold uppercase tracking-wider text-secondary text-left mb-1 block">
                          Danh sách sản phẩm
                        </span>
                        <div className="flex flex-col gap-3">
                          {order.orderDetails?.map((d) => {
                            const imageUrl = d.product?.images?.[0]?.url ?? '/img/pc.png';
                            return (
                              <div
                                key={d.id}
                                className="flex items-center gap-3.5 rounded-xl border border-slate-border/55 bg-bg-card p-3 transition-colors hover:border-slate-border"
                              >
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-slate-border/50 bg-surface-container-low p-1">
                                  <img
                                    src={imageUrl}
                                    alt={d.product?.name || 'Sản phẩm'}
                                    className="h-full w-full object-contain"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = '/img/pc.png';
                                    }}
                                  />
                                </div>
                                <div className="flex flex-1 flex-col justify-between py-0.5 text-left">
                                  <span className="line-clamp-1 text-body-sm font-semibold text-on-surface">
                                    {d.product?.name || 'Sản phẩm'}
                                  </span>
                                  <span className="text-label-xs text-secondary font-medium">
                                    {d.quantity} × {formatVnd(Number(d.price))}
                                  </span>
                                </div>
                                <div className="text-right text-body-sm font-bold text-on-surface">
                                  {formatVnd(Number(d.price) * d.quantity)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                    </div>

                    {/* Right Column: Order Pricing Summary & Actions */}
                    <div className="flex flex-col gap-4 rounded-xl border border-slate-border/60 bg-surface-container-low/20 p-4">
                      <span className="text-label-xs font-bold uppercase tracking-wider text-secondary text-left mb-1 block">
                        Chi tiết thanh toán
                      </span>
                      
                      <div className="flex flex-col gap-2.5 border-b border-slate-border/60 pb-3">
                        <div className="flex justify-between text-body-sm text-secondary">
                          <span>Tạm tính</span>
                          <span className="font-semibold text-on-surface">
                            {formatVnd(Number(order.subtotalAmount))}
                          </span>
                        </div>
                        <div className="flex justify-between text-body-sm text-secondary">
                          <span>Phí vận chuyển</span>
                          <span className="font-semibold text-on-surface">
                            {Number(order.shippingFee) === 0 ? 'Miễn phí' : formatVnd(Number(order.shippingFee))}
                          </span>
                        </div>
                        <div className="flex justify-between text-body-sm text-secondary">
                          <span>Thuế VAT (10%)</span>
                          <span className="font-semibold text-on-surface">
                            {formatVnd(Number(order.vatAmount))}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-body-md font-bold text-on-surface">
                        <span>Tổng tiền</span>
                        <span className="text-lg text-primary font-black">
                          {formatVnd(Number(order.totalAmount))}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 flex flex-col gap-2.5 w-full">
                        {isPayosPending(order) && (
                          <button
                            type="button"
                            disabled={payingId === order.id}
                            className="w-full rounded-lg bg-secondary py-2.5 text-center text-body-sm font-bold text-on-primary hover:bg-inverse-surface active:scale-[0.98] transition-all disabled:opacity-50"
                            onClick={() => handlePayAgain(order)}
                          >
                            {payingId === order.id ? 'Đang kết nối...' : 'Thanh toán PayOS'}
                          </button>
                        )}
                        
                        {canExportInvoice(order) && (
                          <button
                            type="button"
                            className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-tertiary py-2.5 text-center text-body-sm font-bold text-white hover:opacity-95 active:scale-[0.98] transition-all"
                            onClick={() => exportToPDF(order)}
                          >
                            <FileDown className="h-4 w-4" />
                            Xuất hóa đơn PDF
                          </button>
                        )}

                        {order.status === 'PENDING' && (
                          <button
                            type="button"
                            className="w-full rounded-lg border border-error/30 py-2.5 text-center text-body-sm font-bold text-error hover:bg-error/5 active:scale-[0.98] transition-all"
                            onClick={() => {
                              setCancelModal(order.id);
                              setCancelReason('');
                              setCancelError('');
                            }}
                          >
                            Hủy đơn hàng
                          </button>
                        )}
                      </div>

                    </div>

                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={currentPage <= 1}
            className={cart.primaryBtn}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Trước
          </button>
          <span className="text-body-sm">
            Trang {currentPage}/{totalPages}
          </span>
          <button
            type="button"
            disabled={currentPage >= totalPages}
            className={cart.primaryBtn}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Sau
          </button>
        </div>
      )}

      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-bg-card p-6 shadow-elevated transition-all">
            <h3 className="mb-2 text-headline-lg font-bold text-on-surface">Hủy đơn hàng</h3>
            <p className="mb-4 text-body-sm text-secondary">
              Vui lòng nhập lý do hủy đơn (từ 10 đến 200 ký tự)
            </p>
            <textarea
              className={`${cart.formInput} !rounded-lg resize-none`}
              rows={4}
              value={cancelReason}
              onChange={(e) => {
                setCancelReason(e.target.value);
                setCancelError('');
              }}
              placeholder="Nhập lý do hủy đơn hàng..."
            />
            {displayCancelError && (
              <p className="mt-2 text-body-sm text-error">{displayCancelError}</p>
            )}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={cancelLoading}
                className="flex-1 rounded-lg bg-error py-2.5 text-center text-body-sm font-semibold text-white transition-all hover:bg-error/90 active:scale-[0.98] disabled:opacity-60"
                onClick={() => void handleCancel()}
              >
                {cancelLoading ? 'Đang xử lý...' : 'Xác nhận hủy'}
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-slate-border bg-bg-card py-2.5 text-center text-body-sm font-semibold text-on-surface transition-all hover:bg-surface-container-low active:scale-[0.98]"
                onClick={() => setCancelModal(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

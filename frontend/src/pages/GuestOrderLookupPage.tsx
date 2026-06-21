import { useState } from 'react';
import { Link } from 'react-router-dom';
import { orderService } from '@/services/orderService';
import type { Order } from '@/types/order';
import { cart } from '@/styles/cartClasses';

const formatPrice = (amount: number) =>
  amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  ASSIGNED: 'Đã phân công',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Đã trả hàng',
};

export const GuestOrderLookupPage = () => {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimId = orderId.trim();
    const trimEmail = email.trim().toLowerCase();

    if (!trimId || !trimEmail) {
      setError('Vui lòng nhập đầy đủ mã đơn hàng và email.');
      return;
    }
    if (!/^[0-9a-fA-F]{24}$/.test(trimId)) {
      setError('Mã đơn hàng không hợp lệ (phải có 24 ký tự hex).');
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const result = await orderService.getGuestOrder(trimId, trimEmail);
      setOrder(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không tìm thấy đơn hàng.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-[95px]">
      <div className="mx-auto w-full max-w-xl px-4 py-10 md:px-8">
        <h1 className="mb-2 text-headline-lg text-on-surface">
          Tra cứu đơn hàng
        </h1>
        <p className="mb-6 text-body-sm text-secondary">
          Dành cho khách vãng lai. Nhập mã đơn hàng và email bạn đã dùng khi đặt hàng.
        </p>

        <form onSubmit={(e) => void handleLookup(e)} className="flex flex-col gap-4">
          <div className={cart.formGroup}>
            <label className={cart.formLabel}>Mã đơn hàng</label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="VD: 6657c1a3e4b0f12a3c8d9e00"
              className={cart.formInput}
              disabled={loading}
            />
          </div>
          <div className={cart.formGroup}>
            <label className={cart.formLabel}>Email đặt hàng</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className={cart.formInput}
              disabled={loading}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-error/30 bg-error-container px-4 py-2 text-body-sm text-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`${cart.primaryBtn} w-full`}
          >
            {loading ? 'Đang tra cứu...' : 'Tra cứu đơn hàng'}
          </button>
        </form>

        {order && (
          <div className="mt-8 flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-on-surface">
                Đơn #{order.id.slice(-8).toUpperCase()}
              </h2>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-label-xs font-semibold text-primary">
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-outline-variant pt-3 text-body-sm">
              <span className="text-secondary">Ngày đặt</span>
              <span className="text-on-surface">
                {new Date(order.orderAt).toLocaleDateString('vi-VN')}
              </span>
              <span className="text-secondary">Phương thức thanh toán</span>
              <span className="text-on-surface">{order.paymentMethod}</span>
              <span className="text-secondary">Địa chỉ giao hàng</span>
              <span className="text-on-surface">{order.shippingAddress}</span>
              <span className="text-secondary">Tổng tiền</span>
              <span className="font-bold text-primary">
                {formatPrice(order.totalAmount)}
              </span>
            </div>

            {order.orderDetails && order.orderDetails.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-outline-variant pt-3">
                <p className="text-label-xs font-semibold uppercase tracking-wider text-secondary">
                  Sản phẩm
                </p>
                {order.orderDetails.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-3 text-body-sm"
                  >
                    <span className="flex-1 text-on-surface">{line.product.name}</span>
                    <span className="shrink-0 text-secondary">x{line.quantity}</span>
                    <span className="shrink-0 font-semibold text-on-surface">
                      {formatPrice(line.unitPrice * line.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {order.cancelReason && (
              <p className="rounded-md border border-error/20 bg-error-container px-3 py-2 text-body-sm text-error">
                Lý do hủy: {order.cancelReason}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/" className="text-body-sm text-secondary underline hover:text-primary">
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
};

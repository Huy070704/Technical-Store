import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Footer } from '@/components/layout/Footer';
import { orderService } from '@/services/orderService';
import type { Order } from '@/types/order';
import { cart } from '@/styles/cartClasses';
import { Receipt, Calendar, CreditCard, MapPin, DollarSign, Package, ShieldAlert } from 'lucide-react';

const formatPrice = (amount: number) =>
  amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPING: 'Đang giao hàng',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
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
    <div className="min-h-screen bg-bg-base pt-[95px] flex flex-col justify-between">
      <div className="mx-auto w-full max-w-xl px-4 py-10 md:px-8 flex-1">
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
          <div className="mt-8 flex flex-col gap-6 rounded-2xl border border-zinc-200 bg-white p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)] text-left">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <h2 className="font-outfit font-bold text-lg md:text-xl text-zinc-900 tracking-tight flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                <span>Đơn hàng #{order.id.slice(-8).toUpperCase()}</span>
              </h2>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
                {STATUS_LABEL[order.status] ?? order.status}
              </span>
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-4 text-sm text-zinc-800">
              <div className="flex items-center gap-2 text-zinc-400">
                <Calendar className="h-4 w-4" />
                <span className="font-outfit text-xs font-bold uppercase tracking-wider">Ngày đặt</span>
              </div>
              <span className="font-medium text-zinc-800">
                {new Date(order.orderAt).toLocaleDateString('vi-VN')} {new Date(order.orderAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>

              <div className="flex items-center gap-2 text-zinc-400">
                <CreditCard className="h-4 w-4" />
                <span className="font-outfit text-xs font-bold uppercase tracking-wider">Thanh toán</span>
              </div>
              <span className="font-medium text-zinc-800">
                {order.paymentMethod === 'ONLINE' ? 'Chuyển khoản QR (PayOS)' : 'Thanh toán COD'}
              </span>

              <div className="flex items-center gap-2 text-zinc-400">
                <MapPin className="h-4 w-4" />
                <span className="font-outfit text-xs font-bold uppercase tracking-wider">Địa chỉ giao hàng</span>
              </div>
              <span className="font-medium text-zinc-800">
                {order.shippingAddress}
              </span>

              <div className="flex items-center gap-2 text-zinc-400 pt-3 border-t border-zinc-100">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="font-outfit text-xs font-bold uppercase tracking-wider text-zinc-500">Tổng tiền</span>
              </div>
              <span className="font-outfit font-bold text-lg text-primary pt-3 border-t border-zinc-100 tabular-nums">
                {formatPrice(order.totalAmount)}
              </span>
            </div>

            {order.orderDetails && order.orderDetails.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-zinc-100 pt-4">
                <p className="font-outfit text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-1">
                  <Package className="h-4 w-4 text-zinc-400" />
                  <span>Sản phẩm</span>
                </p>
                <div className="flex flex-col gap-3">
                  {order.orderDetails.map((line) => (
                    <div
                      key={line.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-zinc-100 p-3 bg-zinc-50/30 text-sm"
                    >
                      <span className="flex-1 font-outfit font-medium text-zinc-800 line-clamp-1 text-left">{line.product.name}</span>
                      <span className="shrink-0 font-medium text-zinc-400 pl-2">x{line.quantity}</span>
                      <span className="shrink-0 font-outfit font-bold text-zinc-900 tabular-nums pl-4">
                        {formatPrice(line.unitPrice * line.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {order.cancelReason && (
              <div className="flex gap-2.5 rounded-xl border border-error/20 bg-error/5 p-3 text-sm text-error items-start mt-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="font-medium text-left">
                  Lý do hủy đơn: {order.cancelReason}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link to="/" className="text-body-sm text-secondary underline hover:text-primary">
            Về trang chủ
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { cart } from '@/styles/cartClasses';

export const CheckoutResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { clearCart, refreshCart } = useCart();
  const [countdown, setCountdown] = useState(3);

  const paymentSuccess = searchParams.get('paymentSuccess') === 'true';
  const orderSuccess = searchParams.get('orderSuccess') === 'true';
  const paymentCancelled = searchParams.get('paymentCancelled') === 'true';
  const orderId = searchParams.get('orderId');

  const isGuestSuccess = !isAuthenticated() && (paymentSuccess || orderSuccess);

  // Clear guest cart after PayOS success (COD is cleared before redirect)
  useEffect(() => {
    if (!paymentSuccess) return;
    if (isAuthenticated()) {
      void refreshCart();
    } else {
      void clearCart();
    }
  }, [paymentSuccess, isAuthenticated, clearCart, refreshCart]);

  // Auto-redirect guest to home after 3s on any success
  useEffect(() => {
    if (!isGuestSuccess) return;
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          navigate('/', { replace: true });
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isGuestSuccess, navigate]);

  const orderIdLabel = orderId ? `#${orderId.slice(-8).toUpperCase()}` : '';

  if (paymentCancelled) {
    return (
      <div className={`${cart.emptyStateWrap} pt-[95px]`}>
        <h2 className="mb-3 text-headline-lg text-on-surface">
          Đã hủy thanh toán
        </h2>
        <p className="mb-4 text-body-sm text-secondary">
          Đơn hàng {orderIdLabel} vẫn được lưu. Bạn có thể thanh toán lại sau.
        </p>
        {isAuthenticated() ? (
          <Link to="/order-history" className={cart.primaryBtn}>
            Xem lịch sử đơn hàng
          </Link>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className="text-body-sm text-secondary">
              Vui lòng kiểm tra email để lấy mã đơn hàng và thanh toán lại.
            </p>
            <Link to="/cart" className={cart.primaryBtn}>
              Về giỏ hàng
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className={`${cart.emptyStateWrap} pt-[95px]`}>
        <h2 className="mb-3 text-headline-lg text-on-surface">
          Thanh toán thành công
        </h2>
        <p className="mb-4 text-body-sm text-secondary">
          {orderIdLabel ? `Mã đơn hàng: ${orderIdLabel}. ` : ''}
          Chúng tôi đã gửi email xác nhận. Trạng thái đơn sẽ cập nhật sau vài giây.
        </p>
        {isAuthenticated() ? (
          <Link to="/order-history" className={cart.primaryBtn}>
            Xem lịch sử đơn hàng
          </Link>
        ) : (
          <>
            <p className="mb-4 text-body-sm text-secondary">
              Vui lòng kiểm tra email để theo dõi đơn hàng.
            </p>
            <p className="text-body-sm text-secondary">
              Về trang chủ sau{' '}
              <span className="font-semibold text-primary">{countdown}</span> giây...
            </p>
            <Link to="/" className={`${cart.primaryBtn} mt-3`}>
              Về trang chủ ngay
            </Link>
          </>
        )}
      </div>
    );
  }

  // COD placed successfully by guest
  if (orderSuccess) {
    return (
      <div className={`${cart.emptyStateWrap} pt-[95px]`}>
        <h2 className="mb-3 text-headline-lg text-on-surface">
          Đặt hàng thành công!
        </h2>
        <p className="mb-4 text-body-sm text-secondary">
          {orderIdLabel ? `Mã đơn hàng: ${orderIdLabel}. ` : ''}
          Chúng tôi sẽ liên hệ xác nhận và giao hàng sớm nhất. Email xác nhận
          đã được gửi tới hộp thư của bạn.
        </p>
        <p className="mb-3 text-body-sm text-secondary">
          Về trang chủ sau{' '}
          <span className="font-semibold text-primary">{countdown}</span> giây...
        </p>
        <Link to="/" className={cart.primaryBtn}>
          Về trang chủ ngay
        </Link>
      </div>
    );
  }

  return (
    <div className={`${cart.emptyStateWrap} pt-[95px]`}>
      <p className="text-body-sm text-secondary">Không có kết quả thanh toán.</p>
      <Link to="/" className={`${cart.primaryBtn} mt-4`}>
        Về trang chủ
      </Link>
    </div>
  );
};

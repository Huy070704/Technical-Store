import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Footer } from '@/components/layout/Footer';
import { cart } from '@/styles/cartClasses';
import { paymentService } from '@/services/paymentService';

export const CheckoutResultPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { clearCart, refreshCart } = useCart();
  const [countdown, setCountdown] = useState(3);
  const [retryEmail, setRetryEmail] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const paymentSuccess = searchParams.get('paymentSuccess') === 'true';
  const orderSuccess = searchParams.get('orderSuccess') === 'true';
  const paymentCancelled = searchParams.get('paymentCancelled') === 'true';
  const orderId = searchParams.get('orderId');

  const authenticated = isAuthenticated();
  const isGuestSuccess = !authenticated && (paymentSuccess || orderSuccess);
  const isAuthSuccess = authenticated && paymentSuccess;

  // Clear guest cart after PayOS success (COD is cleared before redirect)
  useEffect(() => {
    if (!paymentSuccess) return;
    if (authenticated) {
      void refreshCart();
    } else {
      void clearCart();
    }
  }, [paymentSuccess, authenticated, clearCart, refreshCart]);

  // ── Polling 3s giống đơn tại quầy ────────────────────────────────────────
  // Khi khách được redirect về sau khi thanh toán PayOS, gọi GET /payment/status/:orderId
  // mỗi 3 giây để trigger syncOnlinePaymentIfPaid() trên backend.
  // Dừng khi nhận được PAID hoặc sau 2 phút (40 lần thử).
  useEffect(() => {
    if (!paymentSuccess || !orderId) return;

    let attempts = 0;
    const MAX_ATTEMPTS = 40; // 40 × 3s = 2 phút

    pollingRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const status = await paymentService.getPaymentStatus(orderId);
        const isPaid = ['PAID', 'COMPLETED', 'SUCCESS', 'SUCCESSFUL'].includes(
          (status.status ?? '').toUpperCase(),
        );
        if (isPaid) {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          return;
        }
      } catch {
        // silent — tiếp tục thử
      }
      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
      }
    }, 3000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [paymentSuccess, orderId]);

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

  // Auto-redirect authenticated user to order history after PayOS success
  useEffect(() => {
    if (!isAuthSuccess) return;
    const timer = setTimeout(() => {
      navigate('/order-history', { replace: true });
    }, 2000);
    return () => clearTimeout(timer);
  }, [isAuthSuccess, navigate]);

  const orderIdLabel = orderId ? `#${orderId.slice(-8).toUpperCase()}` : '';

  const handleGuestRetryPayment = async () => {
    if (!orderId) return;
    const email = retryEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setRetryError('Vui lòng nhập email hợp lệ.');
      return;
    }
    setRetrying(true);
    setRetryError(null);
    try {
      const checkoutUrl = await paymentService.createPayosLink(orderId, email);
      window.location.href = checkoutUrl;
    } catch (err) {
      setRetryError(
        err instanceof Error ? err.message : 'Không tạo được link thanh toán. Vui lòng thử lại.',
      );
      setRetrying(false);
    }
  };

  if (paymentCancelled) {
    return (
      <div className="min-h-screen bg-bg-base pt-[95px] flex flex-col justify-between">
        <div className={`${cart.emptyStateWrap} flex-1 flex flex-col items-center justify-center py-12`}>
          <h2 className="mb-3 text-headline-lg text-on-surface">
            Đã hủy thanh toán
          </h2>
          <p className="mb-4 text-body-sm text-secondary text-center max-w-md">
            Đơn hàng {orderIdLabel} vẫn được lưu. Bạn có thể thanh toán lại ngay bên dưới.
          </p>
          {isAuthenticated() ? (
            <Link to="/order-history" className={cart.primaryBtn}>
              Xem lịch sử đơn hàng
            </Link>
          ) : orderId ? (
            <div className="flex w-full max-w-sm flex-col gap-3">
              <p className="text-body-sm text-secondary text-center">
                Nhập email bạn đã dùng khi đặt hàng để thanh toán lại:
              </p>
              <input
                type="email"
                value={retryEmail}
                onChange={(e) => setRetryEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full rounded-lg border border-outline bg-surface px-4 py-2 text-body-md text-on-surface outline-none focus:border-primary"
                disabled={retrying}
              />
              {retryError && (
                <p className="text-body-sm text-error text-center">{retryError}</p>
              )}
              <button
                onClick={() => void handleGuestRetryPayment()}
                disabled={retrying}
                className={cart.primaryBtn}
              >
                {retrying ? 'Đang xử lý...' : 'Thanh toán lại'}
              </button>
              <Link to="/cart" className="text-center text-body-sm text-secondary underline">
                Về giỏ hàng
              </Link>
            </div>
          ) : (
            <Link to="/cart" className={cart.primaryBtn}>
              Về giỏ hàng
            </Link>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-bg-base pt-[95px] flex flex-col justify-between">
        <div className={`${cart.emptyStateWrap} flex-1 flex flex-col items-center justify-center py-12`}>
          <h2 className="mb-3 text-headline-lg text-on-surface">
            Thanh toán thành công
          </h2>
          <p className="mb-4 text-body-sm text-secondary text-center max-w-md">
            {orderIdLabel ? `Mã đơn hàng: ${orderIdLabel}. ` : ''}
            Chúng tôi đã gửi email xác nhận. Trạng thái đơn sẽ cập nhật sau vài giây.
          </p>
          {authenticated ? (
            <>
              <Link to="/order-history" className={cart.primaryBtn}>
                Xem lịch sử đơn hàng
              </Link>
              <p className="mt-3 text-body-sm text-secondary">
                Tự động chuyển trang sau{' '}
                <span className="font-semibold text-primary">2</span> giây...
              </p>
            </>
          ) : (
            <>
              <p className="mb-4 text-body-sm text-secondary text-center">
                Vui lòng kiểm tra email để theo dõi đơn hàng.
              </p>
              <Link to="/orders/lookup" className={cart.primaryBtn}>
                Tra cứu đơn hàng
              </Link>
              <p className="mt-3 text-body-sm text-secondary">
                Về trang chủ sau{' '}
                <span className="font-semibold text-primary">{countdown}</span> giây...
              </p>
              <Link to="/" className="mt-1 text-body-sm text-secondary underline hover:text-primary">
                Về trang chủ ngay
              </Link>
            </>
          )}
        </div>
        <Footer />
      </div>
    );
  }

  // COD placed successfully by guest
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-bg-base pt-[95px] flex flex-col justify-between">
        <div className={`${cart.emptyStateWrap} flex-1 flex flex-col items-center justify-center py-12`}>
          <h2 className="mb-3 text-headline-lg text-on-surface">
            Đặt hàng thành công!
          </h2>
          <p className="mb-4 text-body-sm text-secondary text-center max-w-md">
            {orderIdLabel ? `Mã đơn hàng: ${orderIdLabel}. ` : ''}
            Chúng tôi sẽ liên hệ xác nhận và giao hàng sớm nhất. Email xác nhận
            đã được gửi tới hộp thư của bạn.
          </p>
          <Link to="/orders/lookup" className={`${cart.primaryBtn} mb-2`}>
            Tra cứu đơn hàng
          </Link>
          <p className="mb-2 text-body-sm text-secondary">
            Về trang chủ sau{' '}
            <span className="font-semibold text-primary">{countdown}</span> giây...
          </p>
          <Link to="/" className="text-body-sm text-secondary underline hover:text-primary">
            Về trang chủ ngay
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base pt-[95px] flex flex-col justify-between">
      <div className={`${cart.emptyStateWrap} flex-1 flex flex-col items-center justify-center py-12`}>
        <p className="text-body-sm text-secondary">Không có kết quả thanh toán.</p>
        <Link to="/" className={`${cart.primaryBtn} mt-4`}>
          Về trang chủ
        </Link>
      </div>
      <Footer />
    </div>
  );
};

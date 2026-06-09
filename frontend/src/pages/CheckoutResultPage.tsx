import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cart } from '@/styles/cartClasses';

export const CheckoutResultPage = () => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  const paymentSuccess = searchParams.get('paymentSuccess') === 'true';
  const paymentCancelled = searchParams.get('paymentCancelled') === 'true';
  const orderId = searchParams.get('orderId');

  if (paymentCancelled) {
    return (
      <div className={`${cart.emptyStateWrap} pt-[95px]`}>
        <h2 className="mb-3 text-headline-lg text-on-surface">
          Đã hủy thanh toán
        </h2>
        <p className="mb-4 text-body-sm text-secondary">
          Đơn hàng {orderId ? `#${orderId.slice(-8).toUpperCase()}` : ''} vẫn
          được lưu. Bạn có thể thanh toán lại sau.
        </p>
        {isAuthenticated() ? (
          <Link to="/order-history" className={cart.primaryBtn}>
            Xem lịch sử đơn hàng
          </Link>
        ) : (
          <Link to="/checkout" className={cart.primaryBtn}>
            Quay lại thanh toán
          </Link>
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
          {orderId
            ? `Mã đơn hàng: #${orderId.slice(-8).toUpperCase()}. `
            : ''}
          Chúng tôi đã gửi email xác nhận (nếu có). Trạng thái đơn sẽ cập nhật
          sau vài giây.
        </p>
        {isAuthenticated() ? (
          <Link to="/order-history" className={cart.primaryBtn}>
            Xem lịch sử đơn hàng
          </Link>
        ) : (
          <p className="text-body-sm text-secondary">
            Vui lòng kiểm tra email để theo dõi đơn hàng. Đăng nhập để xem lịch
            sử đơn trên tài khoản.
          </p>
        )}
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

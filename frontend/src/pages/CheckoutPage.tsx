import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { CartLineItem } from '@/types/cart';
import { cart } from '@/styles/cartClasses';
import { formatVnd } from '@/utils/cartFormat';

interface CheckoutLocationState {
  cartLines?: CartLineItem[];
  subtotal?: number;
  shippingFee?: number;
  total?: number;
}

/**
 * Trang thanh toán tạm — nhận dòng đã chọn từ CartPage.
 * Module order API sẽ được nối tại đây sau.
 */
export const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as CheckoutLocationState;
  const lines = state.cartLines ?? [];

  if (!lines.length) {
    return (
      <div className={cart.emptyStateWrap}>
        <h3 className="mb-2 text-headline-lg text-on-surface">Chưa có sản phẩm được chọn</h3>
        <p className="mb-4 text-body-sm text-secondary">
          Vui lòng quay lại giỏ hàng và chọn sản phẩm cần thanh toán.
        </p>
        <Link to="/cart" className={cart.primaryBtn}>
          Về giỏ hàng
        </Link>
      </div>
    );
  }

  return (
    <div className={`${cart.checkoutPageWrap} pt-[95px]`}>
      <div className={cart.checkoutPageContainer}>
        <h1 className="mb-6 text-headline-lg text-on-surface">Thanh toán</h1>
        <div className={cart.checkoutContent}>
          <div className={cart.orderItemsCard}>
            {lines.map((line) => (
              <div key={line.product.id} className={cart.orderItemRow}>
                <div className={cart.orderItemInfo}>
                  <h3>{line.product.name}</h3>
                  <p className={cart.orderItemCategory}>
                    Số lượng: {line.quantity}
                  </p>
                </div>
                <div className={cart.orderItemTotal}>
                  {formatVnd(line.product.price * line.quantity)}
                </div>
              </div>
            ))}
          </div>
          <aside className={cart.orderSummary}>
            <h2 className={cart.orderSummaryTitle}>Tóm tắt</h2>
            <div className={cart.summaryRow}>
              <span>Tạm tính</span>
              <span>{formatVnd(state.subtotal ?? 0)}</span>
            </div>
            <div className={cart.summaryRow}>
              <span>Phí ship</span>
              <span>
                {(state.shippingFee ?? 0) === 0
                  ? 'Miễn phí'
                  : formatVnd(state.shippingFee ?? 0)}
              </span>
            </div>
            <div className={cart.summaryTotal}>
              <span>Tổng</span>
              <span>{formatVnd(state.total ?? 0)}</span>
            </div>
            <p className="mt-4 text-body-sm text-secondary">
              Form đặt hàng và cổng thanh toán sẽ được tích hợp cùng module Order.
            </p>
            <button
              type="button"
              className={`${cart.placeOrderButton} ${cart.codButton} mt-4`}
              onClick={() => navigate('/cart')}
            >
              Quay lại giỏ hàng
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
};

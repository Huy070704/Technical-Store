import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/useCart';
import { FREE_SHIPPING_MIN_VND } from '@/constants/cart';
import { cart } from '@/styles/cartClasses';
import { calcShippingFee, formatVnd } from '@/utils/cartFormat';

interface CartSummaryProps {
  onContinueShopping: () => void;
}

export const CartSummary = ({ onContinueShopping }: CartSummaryProps) => {
  const navigate = useNavigate();
  const {
    items,
    selectedProductIds,
    getSelectedSubtotal,
    selectAllItems,
    operationLoading,
    getSelectedLines,
  } = useCart();

  const selectedCount = items.filter((i) =>
    selectedProductIds.has(i.product.id),
  ).length;
  const subtotal = getSelectedSubtotal();
  const shippingFee = calcShippingFee(subtotal);
  const total = subtotal + shippingFee;
  const allSelected =
    items.length > 0 && selectedCount === items.length;

  const handleCheckout = () => {
    const lines = getSelectedLines();
    if (!lines.length) return;
    navigate('/checkout', {
      state: {
        cartLines: lines,
        subtotal,
        shippingFee,
        total,
      },
    });
  };

  return (
    <aside className={cart.cartSummary}>
      <h2 className={cart.cartSummaryTitle}>Tóm tắt đơn hàng</h2>

      {items.length > 0 && (
        <label className="mb-4 flex cursor-pointer items-center gap-2 text-body-sm text-on-surface">
          <input
            type="checkbox"
            className={cart.checkbox}
            checked={allSelected}
            onChange={(e) => selectAllItems(e.target.checked)}
          />
          Chọn tất cả ({items.length} sản phẩm)
        </label>
      )}

      {selectedCount === 0 && items.length > 0 && (
        <div className={cart.noSelectionWarning}>
          <p>Vui lòng chọn ít nhất một sản phẩm để thanh toán</p>
        </div>
      )}

      <div className={cart.summaryDetails}>
        <div className={cart.summaryRow}>
          <span>Tạm tính ({selectedCount} đã chọn)</span>
          <span>{formatVnd(subtotal)}</span>
        </div>
        <div className={cart.summaryRow}>
          <span>Phí vận chuyển</span>
          <span>
            {shippingFee === 0 ? 'Miễn phí' : formatVnd(shippingFee)}
          </span>
        </div>
        <div className={cart.summaryTotal}>
          <span>Tổng cộng</span>
          <span>{formatVnd(total)}</span>
        </div>
      </div>

      <button
        type="button"
        className={`${cart.checkoutButton} ${selectedCount === 0 ? cart.checkoutButtonDisabled : ''}`}
        disabled={selectedCount === 0 || operationLoading}
        onClick={handleCheckout}
      >
        Thanh toán
      </button>

      <button
        type="button"
        className={cart.continueShoppingBtn}
        onClick={onContinueShopping}
      >
        Tiếp tục mua sắm
      </button>

      {subtotal >= FREE_SHIPPING_MIN_VND && subtotal > 0 && (
        <p className={cart.shippingPromo}>
          Miễn phí vận chuyển cho đơn từ {formatVnd(FREE_SHIPPING_MIN_VND)}
        </p>
      )}
    </aside>
  );
};

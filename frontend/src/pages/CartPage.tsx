import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartItemRow, CartSummary } from '@/components/cart';
import { LoadingIndicator, CartListSkeleton } from '@/components/shared';
import { useCart } from '@/contexts/CartContext';
import type { CartLineItem } from '@/types/cart';
import { cart } from '@/styles/cartClasses';

const EmptyCartIcon = () => (
  <svg
    className={cart.emptyCartIcon}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M16.5 9.4L12.9 5.8M18 5V5C18 4.44772 17.5523 4 17 4H7C6.44772 4 6 4.44772 6 5V5M4 7H20M10 11V17M14 11V17M5 7L6 19C6 19.5523 6.44772 20 7 20H17C17.5523 20 18 19.5523 18 19L19 7"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CartPage = () => {
  const navigate = useNavigate();
  const {
    items,
    loading,
    error,
    isInitialized,
    clearCart,
    operationLoading,
    refreshCart,
  } = useCart();

  useEffect(() => {
    document.body.classList.add('cart-page-active');
    return () => document.body.classList.remove('cart-page-active');
  }, []);

  if (!isInitialized && loading) {
    return (
      <div className={`${cart.pageShell} pt-[95px]`}>
        <div className="mx-auto w-full max-w-page px-4 py-8 md:px-8">
          <div className="mb-6 flex items-center justify-between gap-4">
            <h1 className="text-headline-lg text-on-surface">Giỏ hàng</h1>
            <LoadingIndicator label="Đang tải giỏ hàng..." variant="inline" showLabel={false} />
          </div>
          <div className={cart.cartContent}>
            <CartListSkeleton count={2} />
            <aside className={`${cart.cartSummary} animate-pulse`}>
              <div className="mb-5 h-6 w-40 rounded bg-surface-container-low" />
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-surface-container-low" />
                <div className="h-4 w-full rounded bg-surface-container-low" />
                <div className="h-6 w-full rounded bg-surface-container-low" />
              </div>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className={cart.emptyStateWrap}>
        <h3 className="mb-2 text-headline-lg text-on-surface">Không tải được giỏ hàng</h3>
        <p className="mb-4 text-body-sm text-secondary">{error}</p>
        <button type="button" className={cart.primaryBtn} onClick={() => void refreshCart()}>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className={`${cart.pageShell} pt-[95px]`}>
      <div className="mx-auto w-full max-w-page px-4 py-8 md:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-headline-lg text-on-surface">Giỏ hàng</h1>
          {items.length > 0 && (
            <button
              type="button"
              className="text-body-sm font-medium text-error hover:underline disabled:opacity-50"
              disabled={operationLoading}
              onClick={() => void clearCart()}
            >
              Xóa toàn bộ giỏ
            </button>
          )}
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-error/30 bg-red-50 px-4 py-2 text-body-sm text-error">
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <div className={cart.emptyCart}>
            <EmptyCartIcon />
            <h2 className={cart.emptyCartTitle}>Giỏ hàng trống</h2>
            <p className={cart.emptyCartText}>Thêm sản phẩm để tiếp tục mua sắm</p>
            <button
              type="button"
              className={cart.continueShoppingButton}
              onClick={() => navigate('/')}
            >
              Tiếp tục mua sắm
            </button>
          </div>
        ) : (
          <div className={cart.cartContent}>
            <div className={cart.cartItems}>
              {items.map((item): CartLineItem => ({
                id: item.id,
                quantity: item.quantity,
                product: {
                  id: item.product.id,
                  name: item.product.name,
                  price: item.product.price,
                  stock: item.product.stock,
                  isActive: true,
                  images: item.product.images,
                  category: item.product.category,
                },
              })).map((line) => (
                <CartItemRow key={line.id} item={line} />
              ))}
            </div>
            <CartSummary onContinueShopping={() => navigate('/')} />
          </div>
        )}
      </div>
    </div>
  );
};

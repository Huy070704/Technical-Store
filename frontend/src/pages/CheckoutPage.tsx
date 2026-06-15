import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckoutForm,
  type CheckoutFormData,
} from '@/components/checkout/CheckoutForm';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { orderService } from '@/services/orderService';
import { paymentService } from '@/services/paymentService';
import { cart } from '@/styles/cartClasses';
import { calcOrderPricing } from '@/utils/cartFormat';
import type { CreateOrderDto } from '@/types/order';
import { Footer } from '@/components/layout/Footer';

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const {
    getSelectedLines,
    getSelectedSubtotal,
    refreshCart,
    clearCart,
    isInitialized,
    loading,
  } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const cartLines = getSelectedLines();
  const subtotal = getSelectedSubtotal();
  const pricing = calcOrderPricing(subtotal);

  useEffect(() => {
    if (searchParams.get('paymentCancelled') === 'true') {
      setCancelMessage('Bạn đã hủy thanh toán PayOS. Đơn hàng vẫn được lưu — bạn có thể thanh toán lại từ lịch sử đơn hàng.');
    }
  }, [searchParams]);

  const buildOrderDto = (form: CheckoutFormData): CreateOrderDto => {
    const fullAddress = [
      form.address.trim(),
      form.ward.trim(),
      form.district.trim(),
      form.city.trim(),
    ]
      .filter(Boolean)
      .join(', ');

    const base: CreateOrderDto = {
      shippingAddress: fullAddress,
      paymentMethod: form.paymentMethod,
      requireInvoice: form.requireInvoice,
    };

    if (!isAuthenticated()) {
      if (!form.guestOtp) {
        throw new Error('Vui lòng xác thực email bằng OTP trước khi đặt hàng');
      }
      return {
        ...base,
        isGuest: true,
        guestOtp: form.guestOtp,
        guestInfo: {
          fullName: form.fullName.trim(),
          phone: form.phone.replace(/\D/g, ''),
          email: form.email.trim().toLowerCase(),
        },
        guestCartItems: cartLines.map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
          price: line.product.price,
          name: line.product.name,
        })),
      };
    }

    // Authenticated: include customer info in note for staff reference
    const note = [
      `Khách hàng: ${form.fullName.trim()}`,
      `SĐT: ${form.phone.trim()}`,
      `Email: ${form.email.trim()}`,
    ].join(' | ');

    return {
      ...base,
      note,
      selectedProductIds: cartLines.map((l) => l.product.id),
    };
  };

  const handlePlaceOrder = async (form: CheckoutFormData) => {
    setSubmitting(true);
    setOrderError(null);

    try {
      if (!cartLines.length) {
        throw new Error('Không có sản phẩm được chọn để thanh toán');
      }

      const order = await orderService.createOrder(buildOrderDto(form));

      if (form.paymentMethod === 'ONLINE') {
        // For ONLINE payment, do NOT clear the cart yet.
        // Guest cart is cleared in CheckoutResultPage on paymentSuccess=true.
        // Authenticated cart is refreshed the same way.
        const checkoutUrl = await paymentService.createPayosLink(
          order.id,
          !isAuthenticated() ? form.email.trim().toLowerCase() : undefined,
        );
        window.location.href = checkoutUrl;
        return;
      }

      // COD: order is confirmed immediately — safe to clear now.
      if (!isAuthenticated()) {
        await clearCart();
        navigate(`/checkout/result?orderSuccess=true&orderId=${order.id}`);
      } else {
        await refreshCart();
        navigate('/order-history', {
          state: { message: 'Đặt hàng thành công!' },
        });
      }
    } catch (err) {
      setOrderError(
        err instanceof Error ? err.message : 'Đặt hàng thất bại. Vui lòng thử lại.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isInitialized && loading) {
    return (
      <div className={cart.loadingWrap}>
        <p className="text-body-sm text-secondary">Đang tải giỏ hàng...</p>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className={cart.loadingWrap}>
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-primary/20 border-t-primary" />
          <p className="text-body-sm text-secondary">
            Đang xử lý đơn hàng và chuyển hướng tới cổng thanh toán...
          </p>
        </div>
      </div>
    );
  }

  if (!cartLines.length) {
    return (
      <div className={`${cart.emptyStateWrap} pt-[95px]`}>
        <h3 className="mb-2 text-headline-lg text-on-surface">
          Chưa có sản phẩm được chọn
        </h3>
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

        {cancelMessage && (
          <div className={`${cart.alertBase} ${cart.alertWarning} mb-4`}>
            {cancelMessage}
          </div>
        )}

        <CheckoutForm
          cartLines={cartLines}
          subtotal={subtotal}
          isGuest={!isAuthenticated()}
          isProcessing={submitting}
          error={orderError}
          onPlaceOrder={handlePlaceOrder}
          onBackToCart={() => navigate('/cart')}
        />
      </div>
      <Footer />
    </div>
  );
};

/** Đồng bộ với frontend/src/constants/cart.ts */
const FREE_SHIPPING_MIN_VND = 1_000_000;
const SHIPPING_FEE_VND = 30_000;
const VAT_RATE = 0.1;

export interface OrderPricing {
  subtotalAmount: number;
  shippingFee: number;
  vatAmount: number;
  totalAmount: number;
}

export const calcOrderPricing = (subtotal: number): OrderPricing => {
  const subtotalAmount = Number(subtotal.toFixed(2));
  const shippingFee =
    subtotalAmount >= FREE_SHIPPING_MIN_VND ? 0 : SHIPPING_FEE_VND;
  const vatAmount = Number((subtotalAmount * VAT_RATE).toFixed(2));
  const totalAmount = Number(
    (subtotalAmount + shippingFee + vatAmount).toFixed(2)
  );

  return { subtotalAmount, shippingFee, vatAmount, totalAmount };
};

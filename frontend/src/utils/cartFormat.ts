import {
  FREE_SHIPPING_MIN_VND,
  SHIPPING_FEE_VND,
  VAT_RATE,
} from '@/constants/cart';
import type { GuestCartItem } from '@/services/guestCartService';
import type { CartLineItem, ServerCart } from '@/types/cart';

export const formatVnd = (amount: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(amount)
    .replace('₫', 'đ');

export const getProductCategoryLabel = (
  category: CartLineItem['product']['category'],
): string => {
  if (!category) return 'Sản phẩm';
  if (typeof category === 'string') return category;
  return category.name ?? 'Sản phẩm';
};

export const mapGuestItemsToCartLines = (items: GuestCartItem[]): CartLineItem[] =>
  items.map((guest) => ({
    id: `guest-${guest.productId}`,
    quantity: guest.quantity,
    product: {
      id: guest.productId,
      name: guest.name,
      price: guest.price,
      stock: guest.stock,
      isActive: true,
      images: guest.image ? [{ id: '1', url: guest.image }] : [],
      category: guest.category,
    },
  }));

export const mapServerCartToLines = (cart: ServerCart): CartLineItem[] =>
  (cart.cartItems ?? []).map((line) => ({
    id: line.id,
    quantity: line.quantity,
    product: {
      id: line.product.id,
      name: line.product.name,
      slug: line.product.slug,
      price: Number(line.product.price),
      stock: line.product.stock ?? 0,
      isActive: line.product.isActive !== false,
      images: line.product.images,
      category: line.product.category?.name ?? line.product.category,
    },
  }));

export const calcShippingFee = (subtotal: number): number =>
  subtotal >= FREE_SHIPPING_MIN_VND ? 0 : SHIPPING_FEE_VND;

export const calcVatAmount = (subtotal: number): number =>
  Number((subtotal * VAT_RATE).toFixed(2));

export const calcOrderTotal = (subtotal: number): number => {
  const shipping = calcShippingFee(subtotal);
  const vat = calcVatAmount(subtotal);
  return Number((subtotal + shipping + vat).toFixed(2));
};

export interface OrderPricingBreakdown {
  subtotal: number;
  shippingFee: number;
  vatAmount: number;
  total: number;
}

export const calcOrderPricing = (subtotal: number): OrderPricingBreakdown => ({
  subtotal,
  shippingFee: calcShippingFee(subtotal),
  vatAmount: calcVatAmount(subtotal),
  total: calcOrderTotal(subtotal),
});

export const reconcileSelectedProductIds = (
  lines: CartLineItem[],
  previousSelected: Set<string>,
  previousLineCount: number,
  selectionInitialized: boolean,
): { selected: Set<string>; initialized: boolean } => {
  const currentIds = lines.map((line) => line.product.id);

  if (currentIds.length === 0) {
    // Reset so the next non-empty load treats it as first-time and selects all.
    return { selected: new Set(), initialized: false };
  }

  if (!selectionInitialized) {
    return { selected: new Set(currentIds), initialized: true };
  }

  if (previousSelected.size === 0) {
    return { selected: new Set(), initialized: true };
  }

  const kept = currentIds.filter((id) => previousSelected.has(id));
  const newIds = currentIds.filter((id) => !previousSelected.has(id));
  const hadAllSelected =
    previousLineCount > 0 && previousSelected.size === previousLineCount;

  if (hadAllSelected && newIds.length > 0) {
    return { selected: new Set([...kept, ...newIds]), initialized: true };
  }

  return { selected: new Set(kept), initialized: true };
};

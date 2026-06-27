/** Đồng bộ với frontend/src/constants/cart.ts */
const FREE_SHIPPING_MIN_VND = 5_000_000;
const VAT_RATE = 0.1;

// Quận nội thành Hà Nội
const HANOI_INNER_DISTRICTS = [
  "Hoàn Kiếm", "Ba Đình", "Đống Đa", "Hai Bà Trưng",
  "Cầu Giấy", "Tây Hồ", "Thanh Xuân", "Hoàng Mai",
  "Long Biên", "Nam Từ Liêm", "Bắc Từ Liêm", "Hà Đông",
];

// Huyện ngoại thành Hà Nội
const HANOI_OUTER_DISTRICTS = [
  "Đông Anh", "Sóc Sơn", "Mê Linh", "Gia Lâm",
  "Thường Tín", "Thanh Trì", "Hoài Đức", "Đan Phượng",
  "Thạch Thất", "Quốc Oai", "Chương Mỹ", "Mỹ Đức",
  "Ứng Hòa", "Phú Xuyên", "Ba Vì", "Phúc Thọ",
];

export type ShippingZone = "inner_hanoi" | "outer_hanoi" | "other_province";

export const SHIPPING_FEE: Record<ShippingZone, number> = {
  inner_hanoi: 30_000,
  outer_hanoi: 50_000,
  other_province: 100_000,
};

export function detectShippingZone(address: string): ShippingZone {
  const normalized = address.toLowerCase();

  const isHanoi =
    normalized.includes("hà nội") ||
    normalized.includes("ha noi") ||
    normalized.includes("hanoi");

  if (!isHanoi) return "other_province";

  const isInner = HANOI_INNER_DISTRICTS.some((d) =>
    normalized.includes(d.toLowerCase())
  );
  if (isInner) return "inner_hanoi";

  const isOuter = HANOI_OUTER_DISTRICTS.some((d) =>
    normalized.includes(d.toLowerCase())
  );
  if (isOuter) return "outer_hanoi";

  // Địa chỉ HN nhưng không xác định được quận → nội thành (mặc định)
  return "inner_hanoi";
}

export interface OrderPricing {
  subtotalAmount: number;
  shippingFee: number;
  vatAmount: number;
  totalAmount: number;
  shippingZone: ShippingZone;
}

export const calcOrderPricing = (subtotal: number, shippingAddress?: string): OrderPricing => {
  const subtotalAmount = Number(subtotal.toFixed(2));

  const shippingZone: ShippingZone = shippingAddress
    ? detectShippingZone(shippingAddress)
    : "inner_hanoi";

  const shippingFee = subtotalAmount >= FREE_SHIPPING_MIN_VND
    ? 0
    : SHIPPING_FEE[shippingZone];

  const vatAmount = Number((subtotalAmount * VAT_RATE).toFixed(2));
  const totalAmount = Number((subtotalAmount + shippingFee + vatAmount).toFixed(2));

  return { subtotalAmount, shippingFee, vatAmount, totalAmount, shippingZone };
};

export type OrderStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type PaymentMethodType = 'COD' | 'ONLINE';

export interface OrderProduct {
  id: string;
  name: string;
  price: number;
  images?: { id: string; url: string }[];
  category?: string | { name?: string };
}

export interface OrderDetail {
  id: string;
  quantity: number;
  price: number;
  product: OrderProduct;
}

export interface OrderPayment {
  id: string;
  status: string;
  amount: number;
  method: string;
}

export interface OrderInvoice {
  id: string;
  status: string;
  invoiceNumber?: string | null;
  totalAmount?: number;
}

export interface Order {
  id: string;
  orderDate: string;
  status: OrderStatus;
  subtotalAmount: number;
  shippingFee: number;
  vatAmount: number;
  totalAmount: number;
  shippingAddress: string;
  note?: string;
  cancelReason?: string;
  paymentMethod: string;
  requireInvoice: boolean;
  orderDetails?: OrderDetail[];
  payments?: OrderPayment[];
  invoices?: OrderInvoice[];
}

export interface CreateOrderDto {
  shippingAddress: string;
  note?: string;
  paymentMethod: PaymentMethodType;
  requireInvoice?: boolean;
  isGuest?: boolean;
  guestInfo?: {
    fullName: string;
    phone: string;
    email: string;
  };
  guestCartItems?: Array<{
    productId: string;
    quantity: number;
    price: number;
    name: string;
  }>;
  selectedProductIds?: string[];
  /** Bắt buộc khi isGuest — OTP đã verify qua /otp/verify */
  guestOtp?: string;
}

export interface OrderStatistics {
  total: number;
  pending: number;
  shipping: number;
  delivered: number;
  cancelled: number;
}

export interface PaymentStatus {
  orderId: string;
  status: string;
  amount: number;
  paymentMethod: string;
}

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

export interface OrderLineItem {
  id: string;
  quantity: number;
  unitPrice: number;
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
  paidAt?: string | null;
}

export interface Order {
  id: string;
  orderAt: string;
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
  orderDetails?: OrderLineItem[];
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
  transactionId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ─── Staff-facing types ────────────────────────────────────────────────────────

export interface OrderCustomer {
  name: string;
  email: string;
  phone: string | null;
}

export interface OrderShipper {
  name: string;
  phone: string | null;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderListItem {
  id: string;
  orderDate: string;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: string | null;
  shippingAddress: string | null;
  customer: OrderCustomer | null;
  itemCount: number;
  latestPaymentStatus: string | null;
}

export interface OrderDetail extends OrderListItem {
  note: string | null;
  cancelReason: string | null;
  requireInvoice: boolean;
  shipper: OrderShipper | null;
  items: OrderItem[];
  payments: OrderPayment[];
  invoices: OrderInvoice[];
}

export interface OrderListResponse {
  data: OrderListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CollectPaymentRequest {
  amount: number;
  method: string;
}


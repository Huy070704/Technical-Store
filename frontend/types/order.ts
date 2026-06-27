export type OrderStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'SUCCESSFUL';

export type PaymentMethodType = 'COD' | 'ONLINE' | 'CASH' | 'TRANSFER';

// ─── Create order ─────────────────────────────────────────────────────────────

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
  paidAt?: string;
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
  orderType?: number;
  subtotalAmount: number;
  shippingFee: number;
  vatAmount: number;
  totalAmount: number;
  shippingAddress: string;
  note?: string;
  cancelReason?: string;
  paymentMethod: string;
  requireInvoice: boolean;
  completedAt?: string;
  confirmedAt?: string;
  cancelAt?: string;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  customerIdOrder?: {
    id: string;
    name?: string;
    email: string;
    phone?: string;
  } | null;
  staffIdOrder?: {
    id: string;
    name?: string;
    email: string;
  } | null;
  facility?: { id: string; name?: string } | null;
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

export interface CollectPaymentRequest {
  amount: number;
  method: string;
}

// ─── Order statistics ─────────────────────────────────────────────────────────

export interface OrderStatistics {
  total: number;
  pending: number;
  assigned: number;
  processing: number;
  shipping: number;
  delivered: number;
  cancelled: number;
  returned: number;
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

// ─── Order line item (in detail view) ────────────────────────────────────────

export interface OrderLineItemDetail {
  id: string;
  product: {
    id: string;
    name: string;
    price: number;
    images?: { url: string }[];
    url?: string;
    category?: { name: string };
  };
  quantity: number;
  unitPrice: number;
}

export interface OrderPaymentRecord {
  id: string;
  amount: number;
  status: string;
  method: string;
  paidAt?: string;
}

export interface OrderInvoiceRecord {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  status: string;
  paymentMethod: string;
  paidAt?: string;
}

// ─── Full order detail (used in drawers / detail pages) ──────────────────────

export interface OrderDetail {
  id: string;
  orderAt: string;
  status: OrderStatus;
  orderType: number;
  subtotalAmount: number;
  shippingFee: number;
  vatAmount: number;
  totalAmount: number;
  shippingAddress?: string;
  note?: string;
  cancelReason?: string;
  paymentMethod?: string;
  requireInvoice: boolean;
  completedAt?: string;
  confirmedAt?: string;
  cancelAt?: string;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  customerIdOrder?: {
    id: string;
    name?: string;
    email: string;
    phone?: string;
  } | null;
  staffIdOrder?: {
    id: string;
    name?: string;
    email: string;
  } | null;
  facility?: { id: string; name?: string } | null;
  orderDetails: OrderLineItemDetail[];
  payments: OrderPaymentRecord[];
  invoices: OrderInvoiceRecord[];
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

// ─── List item (lighter, for tables) ─────────────────────────────────────────

export interface OrderListItem {
  id: string;
  orderAt: string;
  orderDate: string;
  status: OrderStatus;
  orderType: number;
  totalAmount: number;
  paymentMethod?: string;
  shippingAddress?: string;
  guestName?: string;
  guestPhone?: string;
  customerIdOrder?: { id: string; name?: string; email: string } | null;
  customer?: OrderCustomer | null;
  staffIdOrder?: { id: string; name?: string } | null;
  itemCount?: number;
  latestPaymentStatus?: string | null;
}

// ─── List response ────────────────────────────────────────────────────────────

export interface OrderListResponse {
  message?: string;
  data: OrderDetail[] | OrderListItem[];
  total: number;
  page: number;
  limit: number;
}

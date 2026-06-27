export type OrderStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'SUCCESSFUL';

export type PaymentMethodType = 'COD' | 'ONLINE' | 'CASH' | 'TRANSFER';

// ─── Create order ─────────────────────────────────────────────────────────────

export interface CreateOrderDto {
  shippingAddress: string;
  note?: string;
  paymentMethod: PaymentMethodType;
  requireInvoice?: boolean;
  isGuest?: boolean;
  guestInfo?: { fullName: string; phone: string; email: string };
  guestCartItems?: Array<{
    productId: string;
    quantity: number;
    price: number;
    name: string;
  }>;
  selectedProductIds?: string[];
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

// ─── List item (lighter, for tables) ─────────────────────────────────────────

export interface OrderListItem {
  id: string;
  orderAt: string;
  status: OrderStatus;
  orderType: number;
  totalAmount: number;
  paymentMethod?: string;
  guestName?: string;
  guestPhone?: string;
  customerIdOrder?: { id: string; name?: string; email: string } | null;
  staffIdOrder?: { id: string; name?: string } | null;
}

// ─── List response ────────────────────────────────────────────────────────────

export interface OrderListResponse {
  message: string;
  data: OrderDetail[];
  total: number;
  page: number;
  limit: number;
}

// ─── Simple order (customer-facing) ──────────────────────────────────────────

export interface Order {
  id: string;
  orderAt: string;
  status: OrderStatus;
  orderType?: number;
  subtotalAmount: number;
  shippingFee: number;
  vatAmount: number;
  totalAmount: number;
  shippingAddress?: string;
  note?: string;
  cancelReason?: string;
  paymentMethod?: string;
  requireInvoice: boolean;
  orderDetails?: OrderLineItemDetail[];
  payments?: OrderPaymentRecord[];
  invoices?: OrderInvoiceRecord[];
}

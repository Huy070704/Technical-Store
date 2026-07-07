export type OrderStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'DELIVERY_FAILED'
  | 'CANCELLED'
  | 'SUCCESSFUL';

export type PaymentMethodType = 'COD' | 'ONLINE';

export interface PaymentStatus {
  id?: string;
  status: string;
  amount?: number;
  method?: string;
  [key: string]: unknown;
}

export interface OrderStatistics {
  total: number;
  pending: number;
  processing: number;
  shipping: number;
  delivered: number;
  cancelled: number;
}

export interface Order {
  id: string;
  orderAt: string;
  status: string;
  paymentMethod: string;
  shippingAddress?: string;
  requireInvoice?: boolean;
  subtotalAmount?: number;
  shippingFee?: number;
  vatAmount?: number;
  totalAmount: number;
  note?: string;
  cancelReason?: string;
  orderDetails?: Array<{
    product?: { id?: string; name?: string; [key: string]: unknown };
    quantity: number;
    unitPrice: number;
  }>;
  payments?: Array<{ method?: string; status: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderCustomer {
  name: string;
  email: string;
  phone: string | null;
}

export interface OrderPayment {
  status: string;
  amount: number;
  [key: string]: unknown;
}

export interface OrderInvoice {
  invoiceNumber?: string;
  [key: string]: unknown;
}

export interface OrderDetail {
  id: string;
  orderDate: string;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: string;
  shippingAddress?: string;
  customer: OrderCustomer | null;
  items: OrderItem[];
  payments: OrderPayment[];
  invoices: OrderInvoice[];
  requireInvoice?: boolean;
  note?: string;
  cancelReason?: string;
  latestPaymentStatus?: string;
  orderType: number;
  [key: string]: unknown;
}

export interface OrderListItem {
  id: string;
  orderDate: string;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: string;
  shippingAddress?: string;
  customer: OrderCustomer | null;
  itemCount: number;
  latestPaymentStatus?: string;
  orderType: number;
}

export interface OrderListResponse {
  data: OrderListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateOrderDto {
  shippingAddress: string;
  paymentMethod: string;
  requireInvoice?: boolean;
  note?: string;
  isGuest?: boolean;
  guestOtp?: string;
  guestInfo?: { fullName: string; phone: string; email: string };
  guestCartItems?: Array<{ productId: string; quantity: number; price: number; name: string }>;
  selectedProductIds?: string[];
}

export interface CollectPaymentRequest {
  method: string;
  amount: number;
}

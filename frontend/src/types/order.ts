export type OrderStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'PROCESSING'
  | 'SHIPPING'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

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

export interface OrderPayment {
  amount: number;
  status: string;
  method: string;
}

export interface OrderInvoice {
  invoiceNumber: string | null;
  status: string;
  totalAmount: number;
  paidAt: string | null;
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

import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { OrderStatus } from '../order.entity';

export class GetOrdersQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  status?: string; // single value hoặc comma-separated, e.g. "SHIPPING,DELIVERED"
}

export class CollectPaymentDto {
  amount!: number;
  method!: string;
}

// ─── nested shapes ─────────────────────────────────────────────────────────

export interface OrderCustomerDto {
  name: string;
  email: string;
  phone: string | null;
}

export interface OrderShipperDto {
  name: string;
  phone: string | null;
}

export interface OrderItemDto {
  productId: string;
  productName: string;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderPaymentDto {
  amount: number;
  status: string;
  method: string;
}

export interface OrderInvoiceDto {
  invoiceNumber: string | null;
  status: string;
  totalAmount: number;
  paidAt: Date | null;
}

// ─── list item ─────────────────────────────────────────────────────────────

export interface OrderListItemDto {
  id: string;
  orderDate: Date;
  status: OrderStatus;
  totalAmount: number;
  paymentMethod: string | null;
  shippingAddress: string | null;
  customer: OrderCustomerDto | null;
  itemCount: number;
  latestPaymentStatus: string | null;
}

// ─── full detail ───────────────────────────────────────────────────────────

export interface OrderDetailDto extends OrderListItemDto {
  note: string | null;
  cancelReason: string | null;
  requireInvoice: boolean;
  shipper: OrderShipperDto | null;
  items: OrderItemDto[];
  payments: OrderPaymentDto[];
  invoices: OrderInvoiceDto[];
}

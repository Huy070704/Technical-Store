import { Account } from "@/modules/auth/account.entity";
import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { OrderDetail } from "./orderDetail.entity";
import { Payment } from "@/modules/payment/payment.entity";
import { Invoice } from "@/modules/payment/invoice.entity";

export enum OrderStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  PROCESSING = 'PROCESSING',
  SHIPPING = 'SHIPPING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURNED = 'RETURNED',
}

@Entity('orders')

// 1. Index đơn cho Shipper (vì Shipper thường chỉ lọc đơn theo ID của họ)
@Index(['shipper']) 
// 2. Composite Index cho Khách hàng: Lọc theo khách hàng và sắp xếp theo ngày giảm dần
@Index('IDX_orders_customer_date', ['customer', 'orderDate'])
// 3. Composite Index cho Admin: Lọc theo trạng thái và ngày để xử lý vận hành
@Index('IDX_orders_status_date', ['status', 'orderDate'])


export class Order extends BaseEntity {
  @ManyToOne(() => Account, (account) => account.customerOrders, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Account | null;

  @ManyToOne(() => Account, (account) => account.shipperOrders, { nullable: true })
  @JoinColumn({ name: 'shipper_id' })
  shipper: Account | null;

  @Column()
  orderDate: Date;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'subtotal_amount', default: 0 })
  subtotalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'shipping_fee', default: 0 })
  shippingFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'vat_amount', default: 0 })
  vatAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  totalAmount: number;

  @Column({ nullable: true })
  shippingAddress: string;

  @Column({ nullable: true })
  note: string;

  @Column({ nullable: true })
  cancelReason: string;

  @Column({ nullable: true, name: 'payment_method' })
  paymentMethod: string;

  @Column({ type: 'boolean', default: false, name: 'require_invoice' })
  requireInvoice: boolean;

  @OneToMany(() => OrderDetail, (orderDetail) => orderDetail.order, { cascade: true })
  orderDetails: OrderDetail[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments: Payment[];

  @OneToMany(() => Invoice, (invoice) => invoice.order)
  invoices: Invoice[];
}

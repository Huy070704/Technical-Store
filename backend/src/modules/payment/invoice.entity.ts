import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { Payment } from "./payment.entity";
import { Order } from "@/modules/order/order.entity";

export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

@Entity('invoices')
// 1. Index đơn cho khóa ngoại Order
@Index(['order'])

// 2. Index đơn cho khóa ngoại Payment (Tối ưu cho quan hệ OneToOne khi đối soát)
@Index(['payment'])

// 3. Composite Index phục vụ thống kê, báo cáo tài chính theo trạng thái và thời gian thanh toán
@Index('IDX_invoices_status_paid_at', ['status', 'paidAt'])

export class Invoice extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.invoices)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @OneToOne(() => Payment, { nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment?: Payment;

  @Column({ type: 'varchar', length: 50, unique: true, nullable: true, name: 'invoice_number' })
  invoiceNumber: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_amount' })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.UNPAID,
    name: 'status',
  })
  status: InvoiceStatus;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'payment_method' })
  paymentMethod: string | null;

  @Column({ type: 'timestamp', nullable: true, name: 'paid_at' })
  paidAt?: Date;

  @Column({ type: 'text', nullable: true, name: 'notes' })
  notes?: string;
}

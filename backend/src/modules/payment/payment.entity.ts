import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, Index, ManyToOne } from "typeorm";
import { Order } from "@/modules/order/order.entity";

@Entity('payments')

// 1. Index cho khóa ngoại order_id để tra cứu thanh toán theo đơn hàng
@Index(['order'])

// 2. Unique Index cho mã đơn hàng của PayOS (Bắt buộc phải có để tối ưu Webhook và chặn trùng lặp)
@Index('IDX_payments_payos_code', ['payosOrderCode'], { unique: true })

export class Payment extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.payments)
  order: Order;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 50 })
  status: string;

  @Column({ type: 'varchar', length: 50 })
  method: string;

  @Column({ type: 'bigint', nullable: true, name: 'payos_order_code' })
  payosOrderCode: string;
}

import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, Index, ManyToOne } from "typeorm";
import { Order } from "./order.entity";
import { Product } from "@/modules/product/product.entity";

@Entity('order_details')
// 1. Index cho khóa ngoại Order (Phục vụ việc lấy danh sách item của một đơn hàng - Tần suất cực cao)
@Index(['order'])

// 2. Index cho khóa ngoại Product (Phục vụ việc thống kê sản phẩm, tính lượt mua, báo cáo doanh thu)
@Index(['product'])

export class OrderDetail extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.orderDetails)
  order: Order;

  @ManyToOne(() => Product, (product) => product.orderDetails)
  product: Product;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;
}

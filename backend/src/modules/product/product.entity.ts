import { Column, Entity, Index, ManyToOne, OneToMany } from "typeorm";
import { NamedEntity } from "@/common/NamedEntity";
import { Category } from "./category.entity";
import { Image } from "./image.entity";

// Forward references để tránh circular imports
import type { CartItem } from "@/modules/cart/cartItem.entity";
import type { OrderDetail } from "@/modules/order/orderDetail.entity";
import type { Feedback } from "@/modules/feedback/feedback.entity";

@Entity('products')

// 1. Composite Index phục vụ bộ lọc danh mục + hiển thị sản phẩm đang bán + sort theo giá
@Index('IDX_products_category_status_price', ['categoryId', 'isActive', 'price'])

// 2. Index đơn cho trạng thái active (Hữu ích khi admin muốn quản lý nhanh các sp đang ẩn/hiện)
@Index(['isActive'])

export class Product extends NamedEntity {
  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'double precision' })
  price: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  stock: number;

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.products)
  category: Category;

  @OneToMany(() => Image, (image) => image.product)
  images: Image[];

  // Quan hệ với CartItem
  @OneToMany("CartItem", "product")
  cartItems: CartItem[];

  // Quan hệ với OrderDetail
  @OneToMany("OrderDetail", "product")
  orderDetails: OrderDetail[];

  // Quan hệ với Feedback
  @OneToMany("Feedback", "product")
  feedbacks: Feedback[];
}

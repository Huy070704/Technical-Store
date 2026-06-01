import { Column, Entity, Index, ManyToOne } from "typeorm";
import { Cart } from "./cart.entity";
import { BaseEntity } from "@/common/BaseEntity";
import { Product } from "@/modules/product/product.entity";

@Entity('cart_items')
// 1. Unique Composite Index: Tối ưu tối đa cho việc tìm sản phẩm trong giỏ và chặn trùng lặp item
@Index('UQ_cart_items_cart_product', ['cart', 'product'], { unique: true })

// 2. Index đơn cho Product: Tối ưu tra cứu ngược từ sản phẩm phục vụ thống kê/vận hành
@Index(['product'])

export class CartItem extends BaseEntity {
  @Column({ type: "int", nullable: false })
  quantity: number;

  @ManyToOne(() => Cart, (cart) => cart.cartItems)
  cart: Cart;

  @ManyToOne(() => Product, (product) => product.cartItems)
  product: Product;
}

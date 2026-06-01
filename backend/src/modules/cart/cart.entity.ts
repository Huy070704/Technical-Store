import { Entity, JoinColumn, OneToMany, OneToOne, Column, Index } from "typeorm";
import { BaseEntity } from "@/common/BaseEntity";
import { CartItem } from "./cartItem.entity";
import { Account } from "@/modules/auth/account.entity";

@Entity('carts')
// Tạo Unique Index tường minh cho account_id để tăng tốc độ lấy giỏ hàng theo User đăng nhập
@Index('UQ_carts_account_id', ['account'], { unique: true })

export class Cart extends BaseEntity {
  @OneToOne(() => Account)
  @JoinColumn()
  account: Account;

  @OneToMany(() => CartItem, (cartItem) => cartItem.cart)
  cartItems: CartItem[];

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;
}

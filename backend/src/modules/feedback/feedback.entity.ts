import { Account } from "@/modules/auth/account.entity";
import { BaseEntity } from "@/common/BaseEntity";
import { Product } from "@/modules/product/product.entity";
import { Column, Entity, Index, ManyToOne, OneToMany } from "typeorm";
import { Image } from "../image/image.entity";

@Entity("feedbacks")

// 1. Composite Index "gánh" luồng xem chi tiết sản phẩm: Lọc theo Product và Sort theo ngày tạo giảm dần
@Index("IDX_feedbacks_product_created_at", ["product", "createdAt"])

// 2. Index cho khóa ngoại Account: Phục vụ tra cứu lịch sử đánh giá của một User
@Index(["account"])

export class Feedback extends BaseEntity {
  @Column({ type: "varchar", length: 500 })
  content: string;

  @ManyToOne(() => Product, (product) => product.feedbacks)
  product: Product;

  @ManyToOne(() => Account, (account) => account.feedbacks)
  account: Account;

  @OneToMany(() => Image, (image) => image.feedback)
  images: Image[];
}

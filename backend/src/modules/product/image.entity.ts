import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, ManyToOne } from "typeorm";
import { Product } from "./product.entity";

@Entity("images")
export class Image extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  originalName: string;

  @Column({ type: "varchar", length: 255 })
  url: string;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @ManyToOne(() => Product, (product) => product.images, { nullable: true })
  product: Product;

  // Quan hệ với Feedback (dùng string để tránh circular)
  @ManyToOne("Feedback", "images", { nullable: true })
  feedback: any;
}

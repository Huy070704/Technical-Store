import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "@/common/BaseEntity";
import { StockCheck } from "./stockCheck.entity";
import { Product } from "@/modules/product/product.entity";

@Entity("stock_check_details")
export class StockCheckDetail extends BaseEntity {
  @ManyToOne(() => StockCheck, (check) => check.details, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "stock_check_id" })
  stockCheck: StockCheck;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "int", nullable: false })
  systemQuantity: number;

  @Column({ type: "int", nullable: false })
  actualQuantity: number;

  @Column({ nullable: true })
  discrepancyReason: string;
}

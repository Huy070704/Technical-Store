import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "@/common/BaseEntity";
import { ImportReceipt } from "./importReceipt.entity";
import { Product } from "@/modules/product/product.entity";

@Entity("import_receipt_details")
export class ImportReceiptDetail extends BaseEntity {
  @ManyToOne(() => ImportReceipt, (receipt) => receipt.details, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "import_receipt_id" })
  importReceipt: ImportReceipt;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "int", nullable: false })
  quantity: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  unitPrice: number;
}

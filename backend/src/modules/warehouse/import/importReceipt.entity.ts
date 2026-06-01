import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "@/common/BaseEntity";
import { Warehouse } from "../warehouse.entity";
import { Supplier } from "../supplier/supplier.entity";
import { Account } from "@/modules/auth/account.entity";
import { ImportReceiptDetail } from "./importReceiptDetail.entity";

@Entity("import_receipts")
export class ImportReceipt extends BaseEntity {
  @ManyToOne(() => Warehouse, { nullable: false })
  @JoinColumn({ name: "warehouse_id" })
  warehouse: Warehouse;

  @ManyToOne(() => Supplier, { nullable: false })
  @JoinColumn({ name: "supplier_id" })
  supplier: Supplier;

  @ManyToOne(() => Account, { nullable: false })
  @JoinColumn({ name: "created_by_id" })
  createdBy: Account;

  @Column({ type: "timestamp without time zone", default: () => "CURRENT_TIMESTAMP" })
  importDate: Date;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => ImportReceiptDetail, (detail) => detail.importReceipt, { cascade: true })
  details: ImportReceiptDetail[];
}

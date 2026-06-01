import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "@/common/BaseEntity";
import { Warehouse } from "../warehouse.entity";
import { Account } from "@/modules/auth/account.entity";
import { StockCheckDetail } from "./stockCheckDetail.entity";

@Entity("stock_checks")
export class StockCheck extends BaseEntity {
  @ManyToOne(() => Warehouse, { nullable: false })
  @JoinColumn({ name: "warehouse_id" })
  warehouse: Warehouse;

  @ManyToOne(() => Account, { nullable: false })
  @JoinColumn({ name: "checked_by_id" })
  checkedBy: Account;

  @Column({ type: "timestamp without time zone", default: () => "CURRENT_TIMESTAMP" })
  checkDate: Date;

  @Column({ nullable: true })
  notes: string;
  
  @Column({ type: "enum", enum: ["PENDING", "COMPLETED", "CANCELLED"], default: "PENDING" })
  status: string;

  @OneToMany(() => StockCheckDetail, (detail) => detail.stockCheck, { cascade: true })
  details: StockCheckDetail[];
}

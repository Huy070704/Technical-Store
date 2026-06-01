import { Column, Entity, OneToMany } from "typeorm";
import { NamedEntity } from "@/common/NamedEntity";
import type { Inventory } from "./inventory.entity";
import type { ImportReceipt } from "./import/importReceipt.entity";
import type { StockCheck } from "./stock-check/stockCheck.entity";

@Entity("warehouses")
export class Warehouse extends NamedEntity {
  @Column({ nullable: false })
  address: string;

  @Column({ type: "int", nullable: true })
  capacity: number;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @OneToMany("Inventory", "warehouse")
  inventories: Inventory[];

  @OneToMany("ImportReceipt", "warehouse")
  importReceipts: ImportReceipt[];

  @OneToMany("StockCheck", "warehouse")
  stockChecks: StockCheck[];
}

import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "@/common/BaseEntity";
import { Inventory } from "./inventory.entity";

@Entity("inventory_details")
export class InventoryDetail extends BaseEntity {
  @ManyToOne(() => Inventory, (inv) => inv.details, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "inventory_id" })
  inventory: Inventory;

  @Column({ type: "varchar", length: 100, nullable: true })
  serialNumber?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  batchNumber?: string;

  @Column({ type: "int", default: 1 })
  quantity: number;
}

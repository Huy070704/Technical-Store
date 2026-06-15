import { Column, Entity, JoinColumn, OneToMany, OneToOne } from "typeorm";
import { NamedEntity } from "@/common/NamedEntity";

// Forward reference
import type { Account } from "@/modules/auth/account.entity";
import type { Inventory } from "@/modules/inventory/inventory.entity";
import type { ImportReceipt } from "@/modules/inventory/import/importReceipt.entity";

@Entity("facilities")
export class Facility extends NamedEntity {
  @Column({ type: "varchar", length: 255, nullable: true })
  address: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  // Manager of the facility
  @OneToOne("Account", { nullable: true })
  @JoinColumn({ name: "managerId" })
  manager: Account;

  // Staff assigned to the facility
  @OneToMany("Account", "facility")
  staffs: Account[];

  // Inventories at the facility
  @OneToMany("Inventory", "facility")
  inventories: Inventory[];

  // Import receipts at the facility
  @OneToMany("ImportReceipt", "facility")
  importReceipts: ImportReceipt[];
}

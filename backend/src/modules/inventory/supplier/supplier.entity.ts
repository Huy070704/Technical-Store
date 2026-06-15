import { Column, Entity, OneToMany } from "typeorm";
import { NamedEntity } from "@/common/NamedEntity";
import type { ImportReceipt } from "../import/importReceipt.entity";

@Entity("suppliers")
export class Supplier extends NamedEntity {
  @Column({ nullable: true })
  contactPerson: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @OneToMany("ImportReceipt", "supplier")
  importReceipts: ImportReceipt[];
}

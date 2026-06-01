import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, JoinColumn, OneToOne, OneToMany } from "typeorm";
import { Product } from "../product.entity";

@Entity("motherboards")
export class Motherboard extends BaseEntity {
  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column()
  chipset: string;

  @Column()
  socket: string;

  @Column({ name: "form_factor" })
  formFactor: string;

  @Column({ name: "ram_slots" })
  ramSlots: number;

  @Column({ name: "max_ram" })
  maxRam: number;

  @Column({ nullable: true, name: "ram_type" })
  ramType: string;

  @Column({ name: "supported_drive_interfaces", nullable: true })
  supportedDriveInterfaces: string;

  @OneToMany("Build", "motherboard")
  builds: any[];
}

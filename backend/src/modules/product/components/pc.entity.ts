import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { Product } from "../product.entity";

@Entity('pcs')
export class PC extends BaseEntity {
  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column()
  processor: string;

  @Column({ name: 'ram_gb' })
  ramGb: number;

  @Column({ name: 'storage_gb' })
  storageGb: number;

  @Column({ name: 'storage_type' })
  storageType: string;

  @Column()
  graphics: string;

  @Column({ name: 'form_factor' })
  formFactor: string;

  @Column({ name: 'power_supply_wattage' })
  powerSupplyWattage: number;

  @Column({ name: 'operating_system' })
  operatingSystem: string;
}

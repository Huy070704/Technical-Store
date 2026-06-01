import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, JoinColumn, OneToOne, OneToMany } from "typeorm";
import { Product } from "../product.entity";

@Entity("drives")
export class Drive extends BaseEntity {
  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column()
  type: string;

  @Column({ name: "capacity_gb" })
  capacityGb: number;

  @Column()
  interface: string;

  @OneToMany("Build", "drive")
  builds: any[];
}

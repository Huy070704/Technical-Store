import { Column, Entity, JoinColumn, OneToOne, OneToMany } from "typeorm";
import { Product } from "../product.entity";
import { BaseEntity } from "@/shared/entities/BaseEntity";
import { Build } from "@/modules/rfq/build.entity";

@Entity("psus")
export class PSU extends BaseEntity {
  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column()
  wattage: number;

  @Column({ name: "efficiency_rating" })
  efficiencyRating: string;

  @Column()
  modular: string;

  @OneToMany(() => Build, (build) => build.psu)
  builds: Build[];
}

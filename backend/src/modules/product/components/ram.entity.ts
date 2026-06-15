import { BaseEntity } from "@/shared/entities/BaseEntity";
import { Column, Entity, JoinColumn, OneToOne, OneToMany } from "typeorm";
import { Product } from "../product.entity";

@Entity("rams")
export class RAM extends BaseEntity {
  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column({ name: "capacity_gb" })
  capacityGb: number;

  @Column({ name: "speed_mhz" })
  speedMhz: number;

  @Column({})
  type: string;}

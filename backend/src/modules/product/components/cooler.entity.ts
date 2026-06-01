import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, JoinColumn, OneToOne, OneToMany } from "typeorm";
import { Product } from "../product.entity";

@Entity("coolers")
export class Cooler extends BaseEntity {
  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column()
  type: string;

  @Column({ name: "supported_sockets" })
  supportedSockets: string;

  @Column({ name: "fan_size_mm" })
  fanSizeMm: number;

  @OneToMany("Build", "cooler")
  builds: any[];
}

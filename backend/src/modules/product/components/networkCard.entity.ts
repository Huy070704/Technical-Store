import { BaseEntity } from "@/shared/entities/BaseEntity";
import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { Product } from "../product.entity";

@Entity('network_cards')
export class NetworkCard extends BaseEntity {
  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  type: string;

  @Column()
  interface: string;

  @Column({ name: 'speed_mbps' })
  speedMbps: number;
}
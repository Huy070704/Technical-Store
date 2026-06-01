import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { Product } from "../product.entity";

@Entity('headsets')
export class Headset extends BaseEntity {
  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column({ name: 'has_microphone' })
  hasMicrophone: boolean;

  @Column()
  connectivity: string;

  @Column({ name: 'surround_sound' })
  surroundSound: boolean;
}

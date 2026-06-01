import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { Product } from "../product.entity";
import { BaseEntity } from "@/common/BaseEntity";

@Entity('keyboards')
export class Keyboard extends BaseEntity {
  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  type: string;

  @Column({ name: 'switch_type' })
  switchType: string;

  @Column()
  connectivity: string;

  @Column()
  layout: string;

  @Column({ name: 'has_rgb' })
  hasRgb: boolean;
}

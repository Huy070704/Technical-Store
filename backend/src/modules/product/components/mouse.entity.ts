import { BaseEntity } from "@/shared/entities/BaseEntity";
import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { Product } from "../product.entity";

@Entity('mice')
export class Mouse extends BaseEntity {
  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  type: string;

  @Column()
  dpi: number;

  @Column()
  connectivity: string;

  @Column({ name: 'has_rgb' })
  hasRgb: boolean;
}
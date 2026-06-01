import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { Product } from "../product.entity";

@Entity('monitors')
export class Monitor extends BaseEntity {
  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column({ type: 'decimal', precision: 4, scale: 1, name: 'size_inch' })
  sizeInch: number;

  @Column()
  resolution: string;

  @Column({ name: 'refresh_rate' })
  refreshRate: number;

  @Column()
  panelType: string;
}

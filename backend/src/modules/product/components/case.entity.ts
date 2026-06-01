import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, JoinColumn, OneToOne, OneToMany } from "typeorm";
import { Product } from "../product.entity";

@Entity("cases")
export class Case extends BaseEntity {
  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column({ name: "form_factor_support" })
  formFactorSupport: string;

  @Column({ name: "has_rgb" })
  hasRgb: boolean;

  @Column({ name: "side_panel_type" })
  sidePanelType: string;

  @Column({ nullable: true, name: "max_gpu_length_mm" })
  maxGpuLengthMm: number;

  @Column({ nullable: true, name: "psu_type" })
  psuType: string;

  @OneToMany("Build", "case")
  builds: any[];
}

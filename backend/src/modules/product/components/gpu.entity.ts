import { BaseEntity } from "@/shared/entities/BaseEntity";
import { Column, Entity, JoinColumn, OneToOne, OneToMany } from "typeorm";
import { Product } from "../product.entity";

@Entity("gpus")
export class GPU extends BaseEntity {
  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column()
  vram: number;

  @Column()
  chipset: string;

  @Column({ name: "memory_type" })
  memoryType: string;

  @Column({ name: "length_mm" })
  lengthMm: number;

  @Column({ nullable: true })
  tdp: number;}

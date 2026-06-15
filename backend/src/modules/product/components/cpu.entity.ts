import { Column, Entity, JoinColumn, OneToOne, OneToMany } from "typeorm";
import { Product } from "../product.entity";
import { BaseEntity } from "@/shared/entities/BaseEntity";

@Entity("cpus")
export class CPU extends BaseEntity {
  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column({ nullable: true })
  model: string;

  @Column()
  cores: number;

  @Column()
  threads: number;

  @Column()
  baseClock: string;

  @Column()
  boostClock: string;

  @Column()
  socket: string;

  @Column()
  architecture: string;

  @Column()
  tdp: number;

  @Column({ nullable: true })
  integratedGraphics: string;}

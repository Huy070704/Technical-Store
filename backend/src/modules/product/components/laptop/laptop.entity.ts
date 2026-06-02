import { BaseEntity } from "@/shared/entities/BaseEntity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from "typeorm";
import { Product } from "../../product.entity";
import { DriveLaptop } from "./drive-laptop.entity";
import { NetworkCardLaptop } from "./networdCard-laptop.entity";
import { CPULaptop } from "./cpu-laptop.entity";
import { GPULaptop } from "./gpu-laptop.entity";
import { RAMLaptop } from "./ram-laptop.entity";

@Entity('laptops')
export class Laptop extends BaseEntity {
  @OneToOne(() => Product)
  @JoinColumn()
  product: Product;

  @Column({ type: "varchar", length: 50 , nullable: true})
  brand: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  model: string;

  @Column({ type: "decimal", precision: 4, scale: 1, name: "screen_size", nullable: true })
  screenSize: number;

  @Column({ type: "varchar", length: 50, name: "screen_type", nullable: true })
  screenType: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  resolution: string;

  @Column({
    type: "decimal",
    precision: 4,
    scale: 1,
    name: "battery_life_hours",
    nullable: true,
  })
  batteryLifeHours: number;

  @Column({ type: "decimal", precision: 4, scale: 2, name: "weight_kg", nullable: true })
  weightKg: number;

  @Column({ type: "varchar", length: 50, name: "os", nullable: true })
  os: string;

  @ManyToOne(() => DriveLaptop, (drive) => drive.laptops)
  drive: DriveLaptop;

  @ManyToOne(() => NetworkCardLaptop, (networkCard) => networkCard.laptops)
  networkCard: NetworkCardLaptop;

  @ManyToOne(() => CPULaptop, (cpu) => cpu.laptops)
  cpuLaptop: CPULaptop;

  @ManyToOne(() => GPULaptop, (gpu) => gpu.laptops)
  gpuLaptop: GPULaptop;

  @ManyToOne(() => RAMLaptop, (ram) => ram.laptops)
  ramLaptop: RAMLaptop;

  @Column({name: "ram-count", nullable: true})
  ramCount: number;
}

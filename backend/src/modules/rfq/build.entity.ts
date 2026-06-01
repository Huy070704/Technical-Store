import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, ManyToOne } from "typeorm";
import { CPU } from "@/modules/product/components/cpu.entity";
import { Motherboard } from "@/modules/product/components/motherboard.entity";
import { RAM } from "@/modules/product/components/ram.entity";
import { GPU } from "@/modules/product/components/gpu.entity";
import { PSU } from "@/modules/product/components/psu.entity";
import { Drive } from "@/modules/product/components/drive.entity";
import { Cooler } from "@/modules/product/components/cooler.entity";
import { Case } from "@/modules/product/components/case.entity";

@Entity("builds")
export class Build extends BaseEntity {
  @Column()
  amount: number;

  @ManyToOne(() => CPU, (cpu) => cpu.builds)
  cpu: CPU;

  @ManyToOne(() => Motherboard, (mb) => mb.builds)
  motherboard: Motherboard;

  @ManyToOne(() => RAM, (ram) => ram.builds)
  ram: RAM;

  @ManyToOne(() => GPU, (gpu) => gpu.builds)
  gpu: GPU;

  @ManyToOne(() => PSU, (psu) => psu.builds)
  psu: PSU;

  @ManyToOne(() => Drive, (drive) => drive.builds)
  drive: Drive;

  @ManyToOne(() => Cooler, (cooler) => cooler.builds)
  cooler: Cooler;

  @ManyToOne(() => Case, (pcCase) => pcCase.builds)
  case: Case;
}

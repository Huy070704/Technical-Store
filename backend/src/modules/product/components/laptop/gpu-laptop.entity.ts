import { Entity, OneToMany } from "typeorm";
import { GPU } from "../gpu.entity";
import { Laptop } from "./laptop.entity";

@Entity("gpus-laptop")
export class GPULaptop extends GPU{
    @OneToMany(() => Laptop, (laptop) => laptop.gpuLaptop)
    laptops: Laptop[];
}
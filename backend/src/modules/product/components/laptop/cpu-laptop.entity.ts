import { Entity, OneToMany } from "typeorm";
import { CPU } from "../cpu.entity";
import { Laptop } from "./laptop.entity";

@Entity("cpus-laptop")
export class CPULaptop extends CPU{
    @OneToMany(() => Laptop, (laptop) => laptop.cpuLaptop)
    laptops: Laptop[];
}
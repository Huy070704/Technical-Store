import { Entity, OneToMany } from "typeorm";
import { RAM } from "../ram.entity";
import { Laptop } from "./laptop.entity";

@Entity("rams-laptop")
export class RAMLaptop extends RAM {
    @OneToMany(() => Laptop, (laptop) => laptop.ramLaptop)
    laptops: Laptop[];
}
import { Entity, OneToMany } from "typeorm";
import { Drive } from "../drive.entity";
import { Laptop } from "./laptop.entity";

@Entity("drives-laptop")
export class DriveLaptop extends Drive{

  @OneToMany(() => Laptop, (laptop) => laptop.drive)
  laptops: Laptop[];
}
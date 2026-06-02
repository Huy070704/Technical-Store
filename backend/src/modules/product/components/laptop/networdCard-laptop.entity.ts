import { Entity, OneToMany } from "typeorm";
import { NetworkCard } from "../networkCard.entity";
import { Laptop } from "./laptop.entity";

@Entity("network-cards-laptop")
export class NetworkCardLaptop extends NetworkCard{

  @OneToMany(() => Laptop, (laptop) => laptop.networkCard)
  laptops: Laptop;
}
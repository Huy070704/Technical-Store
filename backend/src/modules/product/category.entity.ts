import { Entity, OneToMany } from "typeorm";
import { NamedEntity } from "@/common/NamedEntity";
import { Product } from "./product.entity";

@Entity("categories")
export class Category extends NamedEntity {
  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}

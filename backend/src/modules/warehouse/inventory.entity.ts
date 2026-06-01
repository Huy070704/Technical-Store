import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "@/common/BaseEntity";
import { Product } from "@/modules/product/product.entity";
import { Warehouse } from "./warehouse.entity";

@Entity("inventories")
export class Inventory extends BaseEntity {
  @ManyToOne(() => Warehouse, (warehouse) => warehouse.inventories, { nullable: false })
  @JoinColumn({ name: "warehouse_id" })
  warehouse: Warehouse;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "int", default: 0 })
  quantity: number;
  
  @Column({ type: "int", default: 0 })
  minimumStockLevel: number;
}

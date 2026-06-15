import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "@/common/BaseEntity";
import { Product } from "@/modules/product/product.entity";
import { Facility } from "@/modules/facility/facility.entity";
import { InventoryDetail } from "./inventoryDetail.entity";

@Entity("inventories")
export class Inventory extends BaseEntity {
  @ManyToOne(() => Facility, (facility) => facility.inventories, { nullable: false })
  @JoinColumn({ name: "facility_id" })
  facility: Facility;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "int", default: 0 })
  quantity: number;
  
  @Column({ type: "int", default: 0 })
  minimumStockLevel: number;

  @OneToMany(() => InventoryDetail, (detail) => detail.inventory, { cascade: true })
  details: InventoryDetail[];
}

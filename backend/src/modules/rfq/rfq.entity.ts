import { Account } from "@/modules/auth/account.entity";
import { BaseEntity } from "@/common/BaseEntity";
import { Product } from "@/modules/product/product.entity";
import { Column, Entity, ManyToMany, ManyToOne, JoinTable } from "typeorm";

@Entity("rfqs")
export class RFQ extends BaseEntity {
  @Column()
  amount: number;

  @Column()
  fulfilled: boolean;

  @ManyToMany(() => Product)
  @JoinTable()
  products: Product[];

  @ManyToOne(() => Account, (account) => account.rfqs)
  account: Account;
}

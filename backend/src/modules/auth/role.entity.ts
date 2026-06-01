import { Entity, OneToMany } from "typeorm";
import { NamedEntity } from "@/common/NamedEntity";
import { Account } from "./account.entity";

@Entity('roles')
export class Role extends NamedEntity {
  @OneToMany(() => Account, (account) => account.role)
  accounts: Account[];
}

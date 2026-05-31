import { Entity, OneToMany } from "typeorm";
import { NamedEntity } from "@/shared/entities/NamedEntity";
import { Account } from "@/modules/auth/entities/account.entity";

@Entity('roles')
export class Role extends NamedEntity{
    @OneToMany(() => Account, (account) => account.role)
    accounts: Account[];
}
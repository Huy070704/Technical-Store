import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "@/common/BaseEntity";
import { Account } from "@/modules/auth/account.entity";

@Entity('shipper_zones')
export class ShipperZone extends BaseEntity {
  @ManyToOne(() => Account, { nullable: false })
  @JoinColumn({ name: 'shipper_id' })
  shipper: Account;

  @Column({ nullable: false })
  province: string;

  @Column({ nullable: true })
  district: string;

  @Column({ nullable: true })
  ward: string;
}

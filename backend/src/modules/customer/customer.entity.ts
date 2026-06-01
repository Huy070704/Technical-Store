import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "@/common/BaseEntity";
import { Account } from "@/modules/auth/account.entity";

@Entity("customers")
export class Customer extends BaseEntity {
  @Column({ nullable: true })
  fullName: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  gender: string;

  @Column({ type: "date", nullable: true })
  dateOfBirth: Date;

  @Column({ type: "int", default: 0 })
  rewardPoints: number;

  @Column({ nullable: true })
  membershipTier: string;

  @OneToOne(() => Account, { nullable: false, cascade: true })
  @JoinColumn({ name: "account_id" })
  account: Account;
}

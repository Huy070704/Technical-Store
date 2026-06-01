import { Account } from "@/modules/auth/account.entity";
import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, ManyToOne } from "typeorm";

@Entity('marketings')
export class Marketing extends BaseEntity {
  @ManyToOne(() => Account, (account) => account.marketingCampaigns)
  account: Account;

  @Column({ length: 100, name: 'campaign_name' })
  campaignName: string;

  @Column()
  content: string;
}

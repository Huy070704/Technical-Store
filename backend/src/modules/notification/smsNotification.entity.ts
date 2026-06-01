import { Account } from "@/modules/auth/account.entity";
import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, ManyToOne } from "typeorm";

@Entity('sms_notifications')
export class SMSNotification extends BaseEntity {
  @ManyToOne(() => Account, (account) => account.smsNotifications)
  account: Account;

  @Column()
  message: string;

  @Column()
  status: string;

  @Column({ name: 'sent_at' })
  sentAt: Date;
}

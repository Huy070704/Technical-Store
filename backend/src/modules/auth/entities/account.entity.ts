import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { NamedEntity } from "@/shared/entities/NamedEntity";
import { Role } from "@/modules/auth/entities/role.entity";
import { RefreshToken } from "./refreshToken.entity";
import { Order } from "@/modules/order/entities/order.entity";
import { Marketing } from "@/modules/marketing/entities/marketing.entity";
import { SMSNotification } from "@/modules/notification/entities/smsNotification.entity";
import { Image } from "@/modules/image/entities/image.entity";
import { Feedback } from "@/modules/feedback/entities/feedback.entity";
import { RFQ } from "@/modules/rfq/entities/rfq.entity";

@Entity("accounts")
export class Account extends NamedEntity {
  @Column({ nullable: false, unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  @Column({ type: "varchar", nullable: true })
  phone?: string;

  @Column({ nullable: true, unique: true, name: "google_id" })
  googleId?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: false, default: false })
  isRegistered: boolean;

  @ManyToOne(() => Role, (role) => role.accounts)
  role: Role;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.account)
  refreshTokens: RefreshToken[];

  @OneToMany(() => Order, (order) => order.shipper)
  shipperOrders: Order[];

  @OneToMany(() => Order, (order) => order.customer)
  customerOrders: Order[];

  @OneToMany(() => Marketing, (marketing) => marketing.account)
  marketingCampaigns: Marketing[];

  @OneToMany(() => SMSNotification, (smsnotification) => smsnotification.account)
  smsNotifications: SMSNotification[];

  @OneToMany(() => Feedback, (feedback) => feedback.account)
  feedbacks: Feedback[];

  @Column({ type: "int", default: 0 })
  maxOrdersPerDay: number;

  @Column({ type: "int", default: 0 })
  currentOrdersToday: number;

  @Column({ type: "boolean", default: true })
  isAvailable: boolean;

  @Column({ type: "int", default: 1 })
  priority: number;

  @Column({ type: "date", nullable: true })
  lastOrderDate: Date;

  @OneToMany(() => RFQ, (rfq) => rfq.account)
  rfqs: RFQ[];
}
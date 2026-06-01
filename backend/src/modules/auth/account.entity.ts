import { Column, Entity, Index, ManyToOne, OneToMany, OneToOne } from "typeorm";
import { NamedEntity } from "@/common/NamedEntity";
import { Role } from "./role.entity";
import { RefreshToken } from "./refreshToken.entity";
import { Exclude } from "class-transformer";

// Forward references để tránh circular imports
import type { Order } from "@/modules/order/order.entity";
import type { Marketing } from "@/modules/marketing/marketing.entity";
import type { SMSNotification } from "@/modules/notification/smsNotification.entity";
import type { Feedback } from "@/modules/feedback/feedback.entity";
import type { RFQ } from "@/modules/rfq/rfq.entity";
import type { Cart } from "@/modules/cart/cart.entity";

@Entity("accounts")

// 1. Index khóa ngoại Role: Tối ưu cho việc JOIN kiểm tra quyền hạn (Middleware/Guard)
@Index(["role"]) 

// 2. Index trường Phone: Phục vụ tìm kiếm khách hàng, đăng nhập bằng SĐT hoặc gửi SMS
@Index(["phone"]) 

// 3. Composite Index "Sống còn" cho Shipper: 
// Phục vụ thuật toán tự động tìm và gán đơn cho Shipper đang rảnh, độ ưu tiên cao, chưa quá tải đơn trong ngày.
@Index("IDX_shipper_assignment", ["isAvailable", "priority", "currentOrdersToday"])

export class Account extends NamedEntity {
  @Column({ nullable: false, unique: true })
  username: string;

  @Exclude() // khi trả json password sẽ bị loại bỏ hoac bi an
  @Column({ nullable: false })
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: false, default: false })
  isRegistered: boolean;

  @ManyToOne(() => Role, (role) => role.accounts)
  role: Role;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.account)
  refreshTokens: RefreshToken[];

  // Quan hệ với Order (customer & shipper)
  @OneToMany("Order", "customer")
  customerOrders: Order[];

  @OneToMany("Order", "shipper")
  shipperOrders: Order[];

  // Quan hệ với Marketing
  @OneToMany("Marketing", "account")
  marketingCampaigns: Marketing[];

  // Quan hệ với SMSNotification
  @OneToMany("SMSNotification", "account")
  smsNotifications: SMSNotification[];

  // Quan hệ với Feedback
  @OneToMany("Feedback", "account")
  feedbacks: Feedback[];

  // Quan hệ với RFQ
  @OneToMany("RFQ", "account")
  rfqs: RFQ[];

  // Shipper-specific fields
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
}

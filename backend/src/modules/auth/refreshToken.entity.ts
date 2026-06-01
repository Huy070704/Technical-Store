import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, Index, ManyToOne } from "typeorm";
import { Account } from "./account.entity";

@Entity('refresh_tokens')
// 1. Unique Index cho token: Bắt buộc phải có để xác thực token siêu tốc khi có request refresh
@Index('UQ_refresh_tokens_token', ['token'], { unique: true })

// 2. Index cho khóa ngoại Account: Phục vụ tính năng đăng xuất hoặc thu hồi toàn bộ thiết bị
@Index(['account'])
export class RefreshToken extends BaseEntity {
  @Column({ nullable: false })
  token: string;

  @Column({ nullable: false, name: 'expired_at' })
  expiredAt: Date;

  @ManyToOne(() => Account, (account) => account.refreshTokens)
  account: Account;
}

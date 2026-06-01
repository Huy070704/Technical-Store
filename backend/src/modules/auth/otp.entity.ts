import { BaseEntity } from "@/common/BaseEntity";
import { Column, Entity, Index } from "typeorm";

@Entity("otps")

// Composite Index gánh toàn bộ luồng kiểm tra OTP mới nhất và chống spam SMS theo số điện thoại
@Index("IDX_otps_phone_verification", ["phone", "verified", "createdAt"])

export class Otp extends BaseEntity {
  @Column()
  phone: string;

  @Column()
  code: string;

  @Column()
  verified: boolean = false;

  /** Hết hạn (epoch ms) — so sánh trên Node, tránh lệch timezone Neon/Postgres */
  @Column({ type: "bigint", nullable: true, name: "expires_at" })
  expiresAtMs?: string;
}

import { BaseEntity } from "@/shared/entities/BaseEntity";
import { Column, Entity } from "typeorm";

/**
 * Lưu mã OTP gửi qua email.
 * Trường `email` thay thế cho `phone` cũ vì hệ thống xác thực qua email.
 */
@Entity("otps")
export class Otp extends BaseEntity {
  /** Email nhận OTP */
  @Column({ nullable: false })
  email: string;

  /** Mã OTP 6 chữ số */
  @Column({ nullable: false, length: 6 })
  code: string;

  /** Đã được xác minh chưa */
  @Column({ default: false })
  verified: boolean;

  /**
   * Thời điểm hết hạn (epoch milliseconds dạng string để tránh lệch timezone với Postgres/Neon).
   * So sánh trực tiếp trên Node.js: `Number(otp.expiresAtMs) > Date.now()`
   */
  @Column({ type: "bigint", nullable: true, name: "expires-at" })
  expiresAtMs?: string;
}
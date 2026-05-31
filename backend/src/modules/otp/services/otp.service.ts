import { Service } from "typedi";
import { Otp } from "../entities/otp.entity";
import { MailService } from "@/utils/mail/mail.service";
import { DbConnection } from "@/database/dbConnection";
import { ValidationException } from "@/shared/exceptions/http-exceptions";
import { LessThan } from "typeorm";

const OTP_TTL_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES) || 10;
const OTP_TTL_MS = OTP_TTL_MINUTES * 60 * 1000;

export type OtpVerifyResult = "valid" | "expired" | "invalid";

/** Chuẩn hóa và validate email trước khi xử lý OTP */
export function normalizeOtpEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new ValidationException(
      "Invalid email for OTP",
      "OTP chỉ gửi qua email. Vui lòng nhập địa chỉ email hợp lệ."
    );
  }
  return normalized;
}

/** Chuẩn hóa mã OTP: chỉ giữ chữ số, lấy 6 chữ số cuối */
export function normalizeOtpCode(code: string): string {
  const digits = code.replace(/\D/g, "");
  if (digits.length === 0) return "";
  return digits.slice(-6).padStart(6, "0");
}

/** Kiểm tra OTP còn hiệu lực (so sánh epoch ms trên Node để tránh lệch timezone) */
function isOtpStillValid(otp: Otp): boolean {
  if (otp.expiresAtMs) {
    return Number(otp.expiresAtMs) > Date.now();
  }
  return false;
}

@Service()
export class OtpService {
  constructor(private readonly mailService: MailService) {}

  /**
   * Tạo và gửi mã OTP qua email.
   * Xóa OTP cũ chưa xác thực của email đó trước khi tạo mới.
   */
  async sendOtp(email: string): Promise<Otp> {
    const normalizedEmail = normalizeOtpEmail(email);

    const dataSource = await DbConnection.getConnection();
    if (!dataSource) throw new Error("Database connection not available");
    const otpRepo = dataSource.getRepository(Otp);

    // Xóa OTP cũ chưa xác thực để tránh trùng lặp
    await otpRepo.delete({ email: normalizedEmail, verified: false });

    const otp = new Otp();
    otp.email = normalizedEmail;
    otp.code = Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, "0");
    otp.expiresAtMs = String(Date.now() + OTP_TTL_MS);
    await otpRepo.save(otp);

    try {
      await this.mailService.sendOtpMail(normalizedEmail, otp.code);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không gửi được email OTP";
      console.error("❌ Failed to send OTP mail:", err);
      throw new ValidationException(
        `${message}. Kiểm tra EMAIL_HOST, EMAIL_USER, EMAIL_PASS trong backend/.env (Gmail cần App Password).`
      );
    }

    return otp;
  }

  /**
   * Xác thực mã OTP.
   * Trả về: "valid" | "expired" | "invalid"
   */
  async verifyOtp(email: string, code: string): Promise<OtpVerifyResult> {
    const normalizedEmail = normalizeOtpEmail(email);
    const normalizedCode = normalizeOtpCode(code);
    if (!normalizedCode) return "invalid";

    const dataSource = await DbConnection.getConnection();
    if (!dataSource) throw new Error("Database connection not available");
    const otpRepo = dataSource.getRepository(Otp);

    const otp = await otpRepo.findOne({
      where: { email: normalizedEmail, code: normalizedCode },
      order: { createdAt: "DESC" },
    });

    if (!otp) return "invalid";

    if (!isOtpStillValid(otp)) return "expired";

    otp.verified = true;
    await otpRepo.save(otp);
    return "valid";
  }

  /**
   * Throw lỗi phù hợp nếu OTP không hợp lệ.
   * Sử dụng sau khi gọi `verifyOtp()`.
   */
  assertOtpVerified(result: OtpVerifyResult): void {
    if (result === "valid") return;
    if (result === "expired") {
      throw new ValidationException(
        "OTP expired",
        `Mã OTP đã hết hạn (${OTP_TTL_MINUTES} phút). Vui lòng bấm "Gửi lại" để nhận mã mới.`
      );
    }
    throw new ValidationException(
      "OTP is wrong",
      "Mã OTP không đúng. Kiểm tra lại email hoặc thử gửi lại mã mới."
    );
  }

  /**
   * Dọn dẹp OTP hết hạn trong DB bằng bulk-delete, trả về danh sách OTP còn hiệu lực.
   * Được gọi từ OtpController (endpoint admin).
   */
  async getActiveOtp(): Promise<Otp[]> {
    const dataSource = await DbConnection.getConnection();
    if (!dataSource) throw new Error("Database connection not available");
    const otpRepo = dataSource.getRepository(Otp);

    const now = Date.now();

    // Bulk-delete OTP hết hạn trực tiếp trong DB — tối ưu hơn load rồi xóa từng cái
    await otpRepo.delete({
      expiresAtMs: LessThan(String(now)),
    });

    return await otpRepo.find();
  }
}

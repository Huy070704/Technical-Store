import { Service } from "typedi";
import { Otp, OtpDocument } from "../otp.model";
import { MailService } from "@/utils/mail.service";
import { ValidationException } from "@/shared/exceptions/http-exceptions";

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
function isOtpStillValid(otp: OtpDocument): boolean {
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
  async sendOtp(email: string): Promise<OtpDocument> {
    const normalizedEmail = normalizeOtpEmail(email);

    // Xóa OTP cũ chưa xác thực để tránh trùng lặp
    await Otp.deleteMany({ email: normalizedEmail, verified: false });

    const otp = new Otp();
    otp.email = normalizedEmail;
    otp.code = Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, "0");
    otp.verified = false;
    otp.expiresAtMs = Date.now() + OTP_TTL_MS;
    await otp.save();

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

    // Chấp nhận cả OTP chưa xác thực và đã xác thực để verify/order có thể gọi liên tục trong TTL
    const otp = await Otp.findOne({
      email: normalizedEmail,
      code: normalizedCode,
      verified: { $in: [false, true] },
    }).sort({ createdAt: -1 });

    if (!otp) return "invalid";

    if (!isOtpStillValid(otp)) return "expired";

    if (!otp.verified) {
      otp.verified = true;
      await otp.save();
    }
    return "valid";
  }

  /**
   * Kiểm tra OTP đã được xác thực trước đó (qua /otp/verify) và còn trong TTL.
   * Dùng cho createGuestOrder — KHÔNG verify lại, chỉ kiểm tra trạng thái.
   * Trả về: "valid" | "expired" | "invalid"
   */
  async checkVerifiedOtp(email: string, code: string): Promise<OtpVerifyResult> {
    const normalizedEmail = normalizeOtpEmail(email);
    const normalizedCode = normalizeOtpCode(code);
    if (!normalizedCode) return "invalid";

    // Chỉ tìm OTP đã verified — không chấp nhận chưa verified
    const otp = await Otp.findOne({
      email: normalizedEmail,
      code: normalizedCode,
      verified: true,
    }).sort({ createdAt: -1 });

    if (!otp) return "invalid";
    if (!isOtpStillValid(otp)) return "expired";
    return "valid";
  }

  /**
   * Throw lỗi phù hợp nếu OTP không hợp lệ.
   * Sử dụng sau khi gọi `verifyOtp()` hoặc `checkVerifiedOtp()`.
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
   * Xóa OTP đã dùng sau khi đặt hàng thành công để ngăn tái sử dụng.
   */
  async invalidateOtp(email: string, code: string): Promise<void> {
    const normalizedEmail = normalizeOtpEmail(email);
    const normalizedCode = normalizeOtpCode(code);
    await Otp.deleteMany({ email: normalizedEmail, code: normalizedCode });
  }

  /**
   * Dọn dẹp OTP hết hạn trong DB bằng bulk-delete, trả về danh sách OTP còn hiệu lực.
   * Được gọi từ OtpController (endpoint admin).
   */
  async getActiveOtp(): Promise<OtpDocument[]> {
    const now = Date.now();

    // Bulk-delete OTP hết hạn trực tiếp trong DB
    await Otp.deleteMany({ expiresAtMs: { $lt: now } });

    return await Otp.find();
  }
}

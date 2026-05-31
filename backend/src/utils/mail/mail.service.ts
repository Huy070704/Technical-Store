import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { Service } from "typedi";
import { Order } from "@/modules/order/entities/order.entity";
import "dotenv/config";

@Service()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private verified = false;

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;

    const host = process.env.EMAIL_HOST || "smtp.gmail.com";
    const port = Number(process.env.EMAIL_PORT) || 587;
    const user = process.env.EMAIL_USER?.trim() || "";
    const pass = process.env.EMAIL_PASS?.trim() || "";

    const options: SMTPTransport.Options = {
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
      tls: {
        rejectUnauthorized: process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== "false",
      },
    };

    this.transporter = nodemailer.createTransport(options);
    return this.transporter;
  }

  isConfigured(): boolean {
    return Boolean(
      process.env.EMAIL_USER?.trim() && process.env.EMAIL_PASS?.trim()
    );
  }

  private async ensureVerified(): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error(
        "EMAIL_USER và EMAIL_PASS chưa được cấu hình trong backend/.env"
      );
    }
    if (this.verified) return;

    await this.getTransporter().verify();
    this.verified = true;
    console.log("✉️ SMTP mail transport verified");
  }

  async sendOtpMail(to: string, otp: string): Promise<void> {
    const recipient = to.trim().toLowerCase();
    if (!recipient.includes("@")) {
      throw new Error(`Địa chỉ email không hợp lệ: ${to}`);
    }

    if (!this.isConfigured()) {
      const devExpose = process.env.NODE_ENV === "development";
      console.warn(
        "⚠️ Mail chưa cấu hình. OTP:",
        otp,
        "→",
        recipient
      );
      if (devExpose) {
        return;
      }
      throw new Error(
        "Dịch vụ email chưa được cấu hình trên server. Liên hệ quản trị viên."
      );
    }

    const from =
      process.env.EMAIL_FROM ||
      `"Technical Store" <${process.env.EMAIL_USER}>`;

    const mailOptions = {
      from,
      to: recipient,
      subject: "[Technical Store] - Mã OTP xác thực tài khoản",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">
            <h2 style="color: #0066cc; margin: 0;">Technical Store</h2>
          </div>
          <div style="padding: 20px 0;">
            <p>Xin chào,</p>
            <p>Bạn nhận được email này vì đã yêu cầu lấy mã xác thực (OTP) từ hệ thống của chúng tôi.</p>
            <p>Mã xác thực của bạn là:</p>
            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #0066cc; background-color: #f9f9f9; padding: 10px 20px; border-radius: 5px; border: 1px dashed #0066cc;">
                ${otp}
              </span>
            </div>
            <p style="color: #666; font-size: 14px;">Mã này có hiệu lực trong vòng <b>${process.env.OTP_EXPIRY_MINUTES || 10} phút</b>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
          </div>
          <div style="border-top: 1px solid #eee; padding-top: 15px; text-align: center; color: #999; font-size: 12px;">
            <p>Đây là email tự động, vui lòng không phản hồi email này.</p>
            <p>&copy; ${new Date().getFullYear()} Technical Store. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    await this.ensureVerified();
    const info = await this.getTransporter().sendMail(mailOptions) as SMTPTransport.SentMessageInfo;
    console.log(`✉️ OTP email sent to ${recipient} (messageId: ${info.messageId})`);
  }

  async sendOrderConfirmationMail(to: string, order: Order): Promise<boolean> {
    const from =
      process.env.EMAIL_FROM ||
      '"Technical Store" <no-reply@technicalstore.com>';

    const formatVND = (num: number) => {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      })
        .format(num)
        .replace("₫", "đ");
    };

    let itemsHtml = "";
    if (order.orderDetails && order.orderDetails.length > 0) {
      order.orderDetails.forEach((detail, index) => {
        const productName = detail.product?.name || "Linh kiện máy tính";
        const price = Number(detail.price || 0);
        const qty = Number(detail.quantity || 1);
        const subtotal = price * qty;

        itemsHtml += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; text-align: left;">${index + 1}</td>
            <td style="padding: 10px; text-align: left; font-weight: bold;">${productName}</td>
            <td style="padding: 10px; text-align: right;">${formatVND(price)}</td>
            <td style="padding: 10px; text-align: center;">${qty}</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #0066cc;">${formatVND(subtotal)}</td>
          </tr>
        `;
      });
    }

    const mailOptions = {
      from,
      to,
      subject: `[Technical Store] - Xác nhận đơn hàng #${order.id.slice(-8).toUpperCase()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">
            <h2 style="color: #0066cc; margin: 0;">Technical Store</h2>
            <p style="color: #666; font-size: 14px; margin-top: 5px;">Cảm ơn bạn đã mua sắm tại cửa hàng của chúng tôi!</p>
          </div>
          <div style="padding: 20px 0;">
            <h3 style="color: #333;">Xác nhận đặt hàng thành công</h3>
            <p>Kính gửi quý khách,</p>
            <p>Đơn hàng của quý khách đã được tiếp nhận và đang được xử lý.</p>
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #0066cc; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Thông tin đơn hàng</h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 5px 0; color: #666; width: 140px;">Mã đơn hàng:</td>
                  <td style="padding: 5px 0; font-weight: bold;">#${order.id.toUpperCase()}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666;">Ngày đặt hàng:</td>
                  <td style="padding: 5px 0;">${new Date(order.orderDate).toLocaleString("vi-VN")}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666;">Phương thức:</td>
                  <td style="padding: 5px 0; font-weight: bold; color: #2e7d32;">${order.paymentMethod}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #666;">Địa chỉ giao hàng:</td>
                  <td style="padding: 5px 0;">${order.shippingAddress}</td>
                </tr>
              </table>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background-color: #f1f1f1; border-bottom: 2px solid #ddd;">
                  <th style="padding: 10px; text-align: left;">STT</th>
                  <th style="padding: 10px; text-align: left;">Tên sản phẩm</th>
                  <th style="padding: 10px; text-align: right;">Đơn giá</th>
                  <th style="padding: 10px; text-align: center;">SL</th>
                  <th style="padding: 10px; text-align: right;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <div style="text-align: right; margin-top: 20px; font-size: 16px;">
              <p style="margin: 5px 0; color: #0066cc; font-size: 18px; font-weight: bold;">
                Tổng thanh toán: <span>${formatVND(Number(order.totalAmount))}</span>
              </p>
            </div>
          </div>
        </div>
      `,
    };

    try {
      if (!this.isConfigured()) {
        console.warn(
          "⚠️ Mail service credentials are not configured. Cannot send order confirmation to:",
          to
        );
        return false;
      }
      await this.ensureVerified();
      await this.getTransporter().sendMail(mailOptions);
      console.log(`✉️ Order confirmation email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error("❌ Failed to send order confirmation email:", error);
      return false;
    }
  }
}

import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { Service } from "typedi";
import "dotenv/config";
import { Order, OrderDocument } from "../modules/order/models/order.model";

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

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const logoUrl = `${frontendUrl}/assets/images/logo.png`;
    const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || 10;
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from,
      to: recipient,
      subject: "[Technical Store] - Mã OTP xác thực tài khoản",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>[Technical Store] - Mã OTP xác thực tài khoản</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
            <tr>
              <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  <!-- Header Banner -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); padding: 32px 40px; text-align: center;">
                      <div style="margin-bottom: 12px;">
                        <img src="${logoUrl}" alt="Technical Store Logo" height="40" style="height: 40px; display: inline-block; border: 0; outline: none; text-decoration: none;" />
                      </div>
                      <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">Technical Store</h2>
                      <p style="color: #fee2e2; margin: 6px 0 0 0; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">Mã xác thực OTP</p>
                    </td>
                  </tr>
                  <!-- Body Content -->
                  <tr>
                    <td style="padding: 40px 40px 32px 40px;">
                      <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 12px;">Xin chào,</p>
                      <p style="font-size: 15px; line-height: 24px; color: #475569; margin: 0 0 28px 0;">Bạn nhận được email này vì đã yêu cầu lấy mã xác thực (OTP) từ hệ thống của chúng tôi. Vui lòng sử dụng mã bên dưới để tiếp tục:</p>
                      
                      <!-- OTP Box -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                        <tr>
                          <td align="center">
                            <table border="0" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px;">
                              <tr>
                                <td style="padding: 16px 32px; text-align: center;">
                                  <span style="font-family: Menlo, Monaco, Consolas, 'Courier New', monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #dc2626; display: inline-block; padding-left: 8px;">${otp}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Warning Box -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 6px; margin-bottom: 24px;">
                        <tr>
                          <td style="padding: 12px 16px;">
                            <p style="font-size: 13px; line-height: 20px; color: #991b1b; margin: 0;">
                              <strong>Lưu ý:</strong> Mã này có hiệu lực trong vòng <strong>${expiryMinutes} phút</strong>. Để bảo mật tài khoản, tuyệt đối không chia sẻ mã này với bất kỳ ai khác.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center;">
                      <p style="font-size: 12px; line-height: 18px; color: #94a3b8; margin: 0 0 8px 0;">Đây là email tự động từ hệ thống của Technical Store, vui lòng không phản hồi email này.</p>
                      <p style="font-size: 12px; color: #94a3b8; margin: 0;">&copy; ${currentYear} Technical Store. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    await this.ensureVerified();
    const info = await this.getTransporter().sendMail(mailOptions) as SMTPTransport.SentMessageInfo;
    console.log(`✉️ OTP email sent to ${recipient} (messageId: ${info.messageId})`);
  }

  async sendOrderConfirmationMail(to: string, order: OrderDocument): Promise<boolean> {
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

    let customerName = "Quý khách";
    let customerPhone = "Chưa cung cấp";

    if (order.customerIdOrder && typeof order.customerIdOrder === "object") {
      const cust = order.customerIdOrder as any;
      customerName = cust.name || "Quý khách";
      customerPhone = cust.phone || "Chưa cung cấp";
    } else if (order.guestName) {
      customerName = order.guestName;
      customerPhone = order.guestPhone || "Chưa cung cấp";
    }

    let itemsHtml = "";
    if (order.orderDetails && order.orderDetails.length > 0) {
      order.orderDetails.forEach((detail: any, index: number) => {
        const productName = detail.product?.name || "Linh kiện máy tính";
        const price = Number(detail.unitPrice || 0);
        const qty = Number(detail.quantity || 1);
        const subtotal = price * qty;

        itemsHtml += `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 14px 8px; text-align: left; color: #64748b; vertical-align: middle;">${index + 1}</td>
            <td style="padding: 14px 8px; text-align: left; font-weight: 600; color: #0f172a; vertical-align: middle;">${productName}</td>
            <td style="padding: 14px 8px; text-align: right; color: #475569; vertical-align: middle;">${formatVND(price)}</td>
            <td style="padding: 14px 8px; text-align: center; color: #475569; vertical-align: middle;">${qty}</td>
            <td style="padding: 14px 8px; text-align: right; font-weight: 700; color: #dc2626; vertical-align: middle;">${formatVND(subtotal)}</td>
          </tr>
        `;
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const logoUrl = `${frontendUrl}/assets/images/logo.png`;
    const currentYear = new Date().getFullYear();

    const mailOptions = {
      from,
      to,
      subject: `[Technical Store] - Xác nhận đơn hàng #${order.id.slice(-8).toUpperCase()}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>[Technical Store] - Xác nhận đơn hàng thành công</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 40px 0;">
            <tr>
              <td align="center">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  <!-- Header Banner -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #991b1b 0%, #dc2626 100%); padding: 32px 40px; text-align: center;">
                      <div style="margin-bottom: 12px;">
                        <img src="${logoUrl}" alt="Technical Store Logo" height="40" style="height: 40px; display: inline-block; border: 0; outline: none; text-decoration: none;" />
                      </div>
                      <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase;">Technical Store</h2>
                      <p style="color: #fee2e2; margin: 6px 0 0 0; font-size: 12px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase;">Xác nhận đặt hàng thành công</p>
                    </td>
                  </tr>
                  <!-- Body Content -->
                  <tr>
                    <td style="padding: 40px 40px 32px 40px;">
                      <h3 style="color: #0f172a; margin-top: 0; margin-bottom: 12px; font-size: 18px; font-weight: 700;">Kính gửi quý khách,</h3>
                      <p style="color: #475569; font-size: 15px; line-height: 24px; margin: 0 0 28px 0;">Cảm ơn bạn đã mua sắm tại cửa hàng của chúng tôi! Đơn hàng của bạn đã được hệ thống tiếp nhận và đang trong quá trình xử lý.</p>
                      
                      <!-- Order Info Card -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 32px;">
                        <tr>
                          <td style="padding: 24px;">
                            <h4 style="margin: 0 0 16px 0; color: #991b1b; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Thông tin đơn hàng</h4>
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; border-collapse: collapse;">
                              <tr>
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500; width: 140px; vertical-align: top;">Mã đơn hàng:</td>
                                <td style="padding: 8px 0; font-weight: 700; color: #0f172a; vertical-align: top; font-family: monospace; font-size: 15px;">#${order.id.toUpperCase()}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500; vertical-align: top;">Người nhận:</td>
                                <td style="padding: 8px 0; font-weight: 700; color: #0f172a; vertical-align: top;">${customerName}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500; vertical-align: top;">Số điện thoại:</td>
                                <td style="padding: 8px 0; color: #334155; vertical-align: top;">${customerPhone}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500; vertical-align: top;">Ngày đặt hàng:</td>
                                <td style="padding: 8px 0; color: #334155; vertical-align: top;">${new Date(order.orderAt).toLocaleString("vi-VN")}</td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500; vertical-align: top;">Phương thức:</td>
                                <td style="padding: 8px 0; vertical-align: top;">
                                  <span style="background-color: #fef2f2; color: #991b1b; font-weight: 700; padding: 4px 8px; border-radius: 6px; font-size: 12px; border: 1px solid #fee2e2; display: inline-block;">
                                    ${order.paymentMethod}
                                  </span>
                                </td>
                              </tr>
                              <tr>
                                <td style="padding: 8px 0; color: #64748b; font-weight: 500; vertical-align: top;">Địa chỉ giao hàng:</td>
                                <td style="padding: 8px 0; color: #334155; line-height: 20px; vertical-align: top;">${order.shippingAddress}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>

                      <!-- Product Details Table -->
                      <h4 style="margin: 0 0 16px 0; color: #991b1b; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Chi tiết sản phẩm</h4>
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; border-collapse: collapse; margin-bottom: 32px;">
                        <thead>
                          <tr style="border-bottom: 2px solid #e2e8f0;">
                            <th style="padding: 12px 8px; text-align: left; color: #64748b; font-weight: 600; width: 40px;">STT</th>
                            <th style="padding: 12px 8px; text-align: left; color: #64748b; font-weight: 600;">Sản phẩm</th>
                            <th style="padding: 12px 8px; text-align: right; color: #64748b; font-weight: 600; width: 100px;">Đơn giá</th>
                            <th style="padding: 12px 8px; text-align: center; color: #64748b; font-weight: 600; width: 50px;">SL</th>
                            <th style="padding: 12px 8px; text-align: right; color: #64748b; font-weight: 600; width: 110px;">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${itemsHtml}
                        </tbody>
                      </table>

                      <!-- Total Card -->
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border-radius: 12px; border: 1px solid #fee2e2;">
                        <tr>
                          <td style="padding: 20px; text-align: right;">
                            <p style="margin: 0; font-size: 14px; color: #991b1b; font-weight: 500;">Tổng thanh toán</p>
                            <p style="margin: 4px 0 0 0; color: #dc2626; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                              ${formatVND(Number(order.totalAmount))}
                            </p>
                          </td>
                        </tr>
                      </table>

                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 40px; text-align: center;">
                      <p style="font-size: 12px; line-height: 18px; color: #94a3b8; margin: 0 0 8px 0;">Đây là email tự động từ hệ thống của Technical Store, vui lòng không phản hồi email này.</p>
                      <p style="font-size: 12px; color: #94a3b8; margin: 0;">&copy; ${currentYear} Technical Store. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
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

  async sendContactRequestMail(
    name: string,
    email: string,
    phone: string,
    service: string,
    message: string
  ): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("Dịch vụ email chưa được cấu hình trên server.");
    }
    const from =
      process.env.EMAIL_FROM ||
      `"Technical Store Consultation" <${process.env.EMAIL_USER}>`;

    const to = process.env.EMAIL_USER?.trim() || "hieunguyenn1501@gmail.com";

    const mailOptions = {
      from,
      to,
      subject: `[Yêu cầu tư vấn] - ${service || "Tư vấn mua hàng"} - từ ${name}`,
      html: `
        <h3>Yêu cầu tư vấn mới từ khách hàng</h3>
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; font-family: sans-serif; font-size: 14px;">
          <tr>
            <td><strong>Họ và tên:</strong></td>
            <td>${name}</td>
          </tr>
          <tr>
            <td><strong>Email liên hệ:</strong></td>
            <td>${email}</td>
          </tr>
          <tr>
            <td><strong>Số điện thoại:</strong></td>
            <td>${phone || "Chưa cung cấp"}</td>
          </tr>
          <tr>
            <td><strong>Loại tư vấn:</strong></td>
            <td>${service || "Tư vấn mua hàng"}</td>
          </tr>
          <tr>
            <td><strong>Nội dung tin nhắn:</strong></td>
            <td>${message}</td>
          </tr>
        </table>
      `,
    };

    await this.ensureVerified();
    await this.getTransporter().sendMail(mailOptions);
    console.log(`✉️ Contact request email sent to admin: ${to}`);
  }
}

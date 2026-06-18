import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseBefore,
} from "routing-controllers";
import { Service } from "typedi";
import { PaymentService } from "../services/payment.service";
import { parseBody } from "@/shared/validators/parse-body";
import { Auth } from "@/middlewares/auth.middleware";
import { AccountDetailsDto } from "@/modules/auth/account.types";
import { JwtService } from "@/modules/auth/services/jwt.service";
import { z } from "zod";

const createPayosLinkGuestSchema = z.object({
  email: z.string().email("Email không hợp lệ").optional(),
});

interface RequestWithUser {
  user?: AccountDetailsDto;
  headers: Record<string, string | string[] | undefined>;
}

@Service()
@Controller("/payment")
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly jwtService: JwtService
  ) {}

  @Post("/payos-link/:orderId")
  async createPayosLink(
    @Param("orderId") orderId: string,
    @Body({ validate: false }) body: unknown,
    @Req() req: RequestWithUser
  ) {
    const dto = parseBody(createPayosLinkGuestSchema, body);
    const accountId = this.extractAccountId(req);
    const checkoutUrl = await this.paymentService.createPayosPaymentLink(
      orderId,
      {
        accountId: accountId ?? undefined,
        guestEmail: dto?.email,
      }
    );
    return {
      message: "Tạo link thanh toán PayOS thành công",
      checkoutUrl,
      success: true,
    };
  }

  @Get("/status/:orderId")
  async getPaymentStatus(
    @Param("orderId") orderId: string,
    @Req() req: RequestWithUser
  ) {
    const accountId = this.extractAccountId(req);
    const status = await this.paymentService.getPaymentStatus(orderId, {
      accountId: accountId ?? undefined,
    });
    return {
      message: "Lấy trạng thái thanh toán thành công",
      payment: status,
    };
  }

  @Post("/payos-webhook")
  async handlePayosWebhook(@Body() body: Record<string, unknown>) {
    await this.paymentService.handlePayosWebhook(body);
    return {
      message: "Webhook xử lý thành công",
      success: true,
    };
  }

  private extractAccountId(req: RequestWithUser): string | null {
    const authHeader = req.headers?.authorization as string | undefined;
    if (!authHeader?.startsWith("Bearer ")) {
      return null;
    }
    try {
      const token = authHeader.substring(7);
      const decoded = this.jwtService.verifyAccessToken(
        token
      ) as AccountDetailsDto | null;
      return decoded?.accountId ?? null;
    } catch {
      return null;
    }
  }
}

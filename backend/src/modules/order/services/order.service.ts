import { Service } from "typedi";
import { ClientSession } from "mongoose";
import { Order, OrderDocument, OrderStatus } from "../order.entity";
import { OrderDetail } from "../orderDetail.entity";
import { CreateOrderDto, PaymentMethodType } from "../dtos/create-order.dto";
import { UpdateOrderDto } from "../dtos/update-order.dto";
import { calcOrderPricing } from "../utils/order-pricing.util";
import { MAX_CART_LINE_ITEMS } from "@/modules/cart/constants/cart.constants";
import { Cart } from "@/modules/cart/cart.entity";
import { CartItem, CartItemDocument } from "@/modules/cart/cartItem.entity";
import { Product, ProductDocument } from "@/modules/product/product.entity";
import { Account, AccountDocument } from "@/modules/auth/account.entity";
import { Invoice, InvoiceStatus } from "@/modules/payment/invoice.entity";
import { Payment } from "@/modules/payment/payment.entity";
import {
  BadRequestException,
  EntityNotFoundException,
  ForbiddenException,
} from "@/shared/exceptions/http-exceptions";
import { runInTransaction } from "@/shared/mongoose/transaction";
import { Container } from "typedi";
import { OtpService } from "@/modules/otp/services/otp.service";
import {
  isValidVnPhone,
  normalizeVnPhone,
} from "@/shared/validators/vietnam-phone";

/** Populate tương đương ORDER_RELATIONS của TypeORM. */
const ORDER_POPULATE = [
  { path: "customer", populate: { path: "role" } },
  {
    path: "orderDetails",
    populate: {
      path: "product",
      populate: [{ path: "category" }, { path: "images" }],
    },
  },
  { path: "payments" },
  { path: "invoices" },
] as const;

@Service()
export class OrderService {
  constructor(private readonly otpService: OtpService) {}

  private validateStatusTransition(current: OrderStatus, next: OrderStatus): boolean {
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [
        OrderStatus.ASSIGNED,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPING,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.ASSIGNED]: [
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPING,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
      [OrderStatus.SHIPPING]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.RETURNED]: [],
    };
    return (allowed[current] ?? []).includes(next);
  }

  async createOrder(accountId: string, dto: CreateOrderDto): Promise<OrderDocument> {
    if (!dto.shippingAddress?.trim()) {
      throw new BadRequestException("Địa chỉ giao hàng không được để trống");
    }

    const savedOrder = await runInTransaction(async (session) => {
      const account = await Account.findById(accountId)
        .populate("role")
        .session(session ?? null);
      if (!account) {
        throw new EntityNotFoundException("Account");
      }

      const cart = await Cart.findOne({ account: accountId })
        .populate({
          path: "cartItems",
          populate: {
            path: "product",
            populate: [{ path: "category" }, { path: "images" }],
          },
        })
        .session(session ?? null);

      if (!cart?.cartItems?.length) {
        throw new BadRequestException(
          "Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi đặt hàng."
        );
      }

      let lines = cart.cartItems;
      if (dto.selectedProductIds?.length) {
        const selected = new Set(dto.selectedProductIds);
        lines = lines.filter((line) =>
          selected.has((line.product as ProductDocument).id)
        );
        if (!lines.length) {
          throw new BadRequestException("Không có sản phẩm được chọn để thanh toán");
        }
      }

      await this.validateAndLockLines(session, lines);

      const subtotal = lines.reduce(
        (sum, line) => sum + Number((line.product as ProductDocument).price) * line.quantity,
        0
      );
      const pricing = calcOrderPricing(subtotal);
      const now = new Date();

      const order = await this.persistOrder(session, {
        customer: account,
        dto,
        pricing,
        now,
      });

      await this.createOrderDetailsAndDeductStock(session, lines, order);
      await this.createInvoiceAndPayment(session, order, dto.paymentMethod, now);

      const selectedIds = new Set(lines.map((l) => (l.product as ProductDocument).id));
      const remaining = cart.cartItems.filter(
        (l) => !selectedIds.has((l.product as ProductDocument).id)
      );
      if (remaining.length < cart.cartItems.length) {
        const toRemove = cart.cartItems.filter((l) =>
          selectedIds.has((l.product as ProductDocument).id)
        );
        if (toRemove.length) {
          await CartItem.deleteMany(
            { _id: { $in: toRemove.map((l) => l._id) } },
            { session: session ?? undefined }
          );
        }
        cart.cartItems = remaining;
        cart.totalAmount = await this.recalcCartTotal(session, remaining);
        await cart.save({ session: session ?? undefined });
      }

      return this.loadOrder(session, order._id.toString());
    });

    if (dto.paymentMethod !== PaymentMethodType.ONLINE) {
      await this.sendConfirmationEmail(savedOrder);
    }
    return savedOrder;
  }

  async createGuestOrder(dto: CreateOrderDto): Promise<OrderDocument> {
    if (!dto.guestInfo) {
      throw new BadRequestException("Thông tin khách hàng là bắt buộc");
    }
    if (!dto.guestOtp?.trim()) {
      throw new BadRequestException(
        "Vui lòng xác thực email bằng OTP trước khi đặt hàng"
      );
    }
    if (!dto.guestCartItems?.length) {
      throw new BadRequestException("Giỏ hàng khách không được trống");
    }
    if (dto.guestCartItems.length > MAX_CART_LINE_ITEMS) {
      throw new BadRequestException(`Giỏ hàng vượt quá ${MAX_CART_LINE_ITEMS} sản phẩm`);
    }

    const { fullName, phone, email } = dto.guestInfo;
    if (!fullName?.trim() || !phone?.trim() || !email?.trim()) {
      throw new BadRequestException("Thông tin khách hàng không hợp lệ");
    }

    const normalizedPhone = normalizeVnPhone(phone);
    if (!isValidVnPhone(normalizedPhone)) {
      throw new BadRequestException("Số điện thoại Việt Nam không hợp lệ");
    }

    const otpResult = await this.otpService.verifyOtp(
      email.trim().toLowerCase(),
      dto.guestOtp
    );
    this.otpService.assertOtpVerified(otpResult);

    const savedOrder = await runInTransaction(async (session) => {
      const productIds = dto.guestCartItems!.map((i) => i.productId);
      const products = await Product.find({ _id: { $in: productIds } }).session(
        session ?? null
      );

      const priceIssues: string[] = [];
      const stockIssues: string[] = [];

      for (const item of dto.guestCartItems!) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new BadRequestException(`Sản phẩm ${item.name} không tồn tại`);
        }
        if (Math.abs(Number(product.price) - item.price) > 0.01) {
          priceIssues.push(product.name ?? item.name);
        }
        if (!product.isActive) {
          stockIssues.push(`${product.name} (ngừng kinh doanh)`);
        } else if ((product.stock ?? 0) < item.quantity) {
          stockIssues.push(
            `${product.name} (tồn: ${product.stock}, cần: ${item.quantity})`
          );
        }
      }

      if (priceIssues.length) {
        throw new BadRequestException(
          `Giá sản phẩm đã thay đổi: ${priceIssues.join(", ")}`
        );
      }
      if (stockIssues.length) {
        throw new BadRequestException(`Tồn kho không đủ: ${stockIssues.join(", ")}`);
      }

      const subtotal = dto.guestCartItems!.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId)!;
        return sum + Number(product.price) * item.quantity;
      }, 0);

      const pricing = calcOrderPricing(subtotal);
      const now = new Date();

      const guestNote = [
        dto.note?.trim() ?? "",
        `Khách hàng: ${fullName.trim()}`,
        `SĐT: ${phone.trim()}`,
        `Email: ${email.trim().toLowerCase()}`,
      ]
        .filter(Boolean)
        .join(" | ");

      const order = await this.persistOrder(session, {
        customer: null,
        dto: { ...dto, note: guestNote },
        pricing,
        now,
      });

      for (const item of dto.guestCartItems!) {
        const product = products.find((p) => p.id === item.productId)!;
        const detail = new OrderDetail();
        detail.order = order._id;
        detail.product = product._id;
        detail.quantity = item.quantity;
        detail.price = Number(product.price);
        await detail.save({ session: session ?? undefined });

        product.stock = (product.stock ?? 0) - item.quantity;
        await product.save({ session: session ?? undefined });
      }

      await this.createInvoiceAndPayment(session, order, dto.paymentMethod, now);
      return this.loadOrder(session, order._id.toString());
    });

    if (dto.paymentMethod !== PaymentMethodType.ONLINE && dto.guestInfo.email) {
      await this.sendConfirmationEmail(savedOrder, dto.guestInfo.email);
    }
    return savedOrder;
  }

  async getOrdersByCustomer(
    accountId: string,
    page = 1,
    limit = 20
  ): Promise<{ orders: OrderDocument[]; total: number }> {
    const offset = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find({ customer: accountId })
        .populate(ORDER_POPULATE as any)
        .sort({ orderDate: -1 })
        .skip(offset)
        .limit(limit),
      Order.countDocuments({ customer: accountId }),
    ]);
    return { orders, total };
  }

  async getOrderStatistics(accountId: string) {
    const [total, pending, shipping, delivered, cancelled] = await Promise.all([
      Order.countDocuments({ customer: accountId }),
      Order.countDocuments({ customer: accountId, status: OrderStatus.PENDING }),
      Order.countDocuments({ customer: accountId, status: OrderStatus.SHIPPING }),
      Order.countDocuments({ customer: accountId, status: OrderStatus.DELIVERED }),
      Order.countDocuments({ customer: accountId, status: OrderStatus.CANCELLED }),
    ]);

    return { total, pending, shipping, delivered, cancelled };
  }

  async getOrderById(orderId: string, accountId?: string): Promise<OrderDocument> {
    const order = await Order.findById(orderId).populate(ORDER_POPULATE as any);
    if (!order) {
      throw new EntityNotFoundException("Order");
    }
    if (accountId && (order.customer as AccountDocument)?.id !== accountId) {
      throw new ForbiddenException("Bạn không có quyền xem đơn hàng này");
    }
    return order;
  }

  async updateOrderStatus(
    orderId: string,
    accountId: string,
    dto: UpdateOrderDto
  ): Promise<OrderDocument> {
    const order = await Order.findById(orderId).populate([
      { path: "customer" },
      { path: "orderDetails", populate: { path: "product" } },
    ] as any);
    if (!order) {
      throw new EntityNotFoundException("Order");
    }
    if ((order.customer as AccountDocument)?.id !== accountId) {
      throw new ForbiddenException("Bạn không có quyền cập nhật đơn hàng này");
    }

    if (!this.validateStatusTransition(order.status, dto.status)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái từ ${order.status} sang ${dto.status}`
      );
    }

    const oldStatus = order.status;

    await runInTransaction(async (session) => {
      if (
        dto.status === OrderStatus.CANCELLED &&
        [OrderStatus.PENDING, OrderStatus.ASSIGNED, OrderStatus.PROCESSING].includes(
          oldStatus
        )
      ) {
        for (const detail of order.orderDetails ?? []) {
          const productId = (detail.product as ProductDocument).id;
          const product = await Product.findById(productId).session(session ?? null);
          if (product) {
            product.stock = (product.stock ?? 0) + detail.quantity;
            await product.save({ session: session ?? undefined });
          }
        }
      }

      const toUpdate = await Order.findById(orderId).session(session ?? null);
      if (!toUpdate) {
        throw new EntityNotFoundException("Order");
      }
      toUpdate.status = dto.status;
      if (dto.cancelReason) {
        toUpdate.cancelReason = dto.cancelReason;
      }
      await toUpdate.save({ session: session ?? undefined });
    });

    return this.getOrderById(orderId, accountId);
  }

  async confirmDelivery(orderId: string, accountId: string): Promise<OrderDocument> {
    return this.updateOrderStatus(orderId, accountId, {
      status: OrderStatus.DELIVERED,
    });
  }

  private async persistOrder(
    session: ClientSession | undefined,
    opts: {
      customer: AccountDocument | null;
      dto: CreateOrderDto;
      pricing: ReturnType<typeof calcOrderPricing>;
      now: Date;
    }
  ): Promise<OrderDocument> {
    const { customer, dto, pricing, now } = opts;
    const order = new Order();
    order.customer = customer ? customer._id : null;
    order.orderDate = now;
    order.status = OrderStatus.PENDING;
    order.subtotalAmount = pricing.subtotalAmount;
    order.shippingFee = pricing.shippingFee;
    order.vatAmount = pricing.vatAmount;
    order.totalAmount = pricing.totalAmount;
    order.shippingAddress = dto.shippingAddress.trim();
    order.note = dto.note?.trim() ?? "";
    order.paymentMethod =
      dto.paymentMethod === PaymentMethodType.ONLINE ? "ONLINE" : "COD";
    order.requireInvoice = dto.requireInvoice ?? false;
    await order.save({ session: session ?? undefined });
    return order;
  }

  private async createOrderDetailsAndDeductStock(
    session: ClientSession | undefined,
    lines: CartItemDocument[],
    order: OrderDocument
  ): Promise<void> {
    const productIds = lines.map((l) => (l.product as ProductDocument).id);
    const products = await Product.find({ _id: { $in: productIds } }).session(
      session ?? null
    );

    for (const line of lines) {
      const product = products.find(
        (p) => p.id === (line.product as ProductDocument).id
      )!;
      const detail = new OrderDetail();
      detail.order = order._id;
      detail.product = product._id;
      detail.quantity = line.quantity;
      detail.price = Number(product.price);
      await detail.save({ session: session ?? undefined });

      product.stock = (product.stock ?? 0) - line.quantity;
      await product.save({ session: session ?? undefined });
    }
  }

  private async createInvoiceAndPayment(
    session: ClientSession | undefined,
    order: OrderDocument,
    paymentMethod: PaymentMethodType,
    now: Date
  ): Promise<void> {
    const invoiceNumber = `INV${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getTime()).slice(-6)}`;

    const invoice = new Invoice();
    invoice.order = order._id;
    invoice.invoiceNumber = invoiceNumber;
    invoice.totalAmount = order.totalAmount;
    invoice.paymentMethod = paymentMethod === PaymentMethodType.ONLINE ? "PAYOS" : "COD";
    invoice.status = InvoiceStatus.UNPAID;
    invoice.notes = `Hóa đơn cho đơn ${order.id}`;
    await invoice.save({ session: session ?? undefined });

    if (paymentMethod === PaymentMethodType.ONLINE) {
      const payment = new Payment();
      payment.order = order._id;
      payment.amount = order.totalAmount;
      payment.status = "pending";
      payment.method = "PAYOS";
      await payment.save({ session: session ?? undefined });
    }
  }

  private async validateAndLockLines(
    session: ClientSession | undefined,
    lines: CartItemDocument[]
  ): Promise<void> {
    const productIds = lines.map((l) => (l.product as ProductDocument).id);
    const products = await Product.find({ _id: { $in: productIds } }).session(
      session ?? null
    );

    const issues: string[] = [];
    for (const line of lines) {
      const lineProduct = line.product as ProductDocument;
      const product = products.find((p) => p.id === lineProduct.id);
      if (!product) {
        issues.push(`${lineProduct.name} (không tồn tại)`);
        continue;
      }
      if (!product.isActive) {
        issues.push(`${product.name} (ngừng kinh doanh)`);
      } else if ((product.stock ?? 0) < line.quantity) {
        issues.push(`${product.name} (tồn: ${product.stock}, cần: ${line.quantity})`);
      }
      if (Number(product.price) !== Number(lineProduct.price)) {
        issues.push(
          `${product.name} (giá đã đổi: ${lineProduct.price} → ${product.price})`
        );
      }
    }
    if (issues.length) {
      throw new BadRequestException(`Giỏ hàng không hợp lệ: ${issues.join("; ")}`);
    }
  }

  private async loadOrder(
    session: ClientSession | undefined,
    orderId: string
  ): Promise<OrderDocument> {
    const order = await Order.findById(orderId)
      .populate(ORDER_POPULATE as any)
      .session(session ?? null);
    if (!order) {
      throw new Error("Không tải được đơn hàng vừa tạo");
    }
    return order;
  }

  private async recalcCartTotal(
    session: ClientSession | undefined,
    lines: CartItemDocument[]
  ): Promise<number> {
    if (!lines.length) return 0;
    let total = 0;
    for (const line of lines) {
      const product = await Product.findById(
        (line.product as ProductDocument).id
      ).session(session ?? null);
      if (product) {
        total += Number(product.price) * line.quantity;
      }
    }
    return Number(total.toFixed(2));
  }

  private async sendConfirmationEmail(
    order: OrderDocument,
    overrideEmail?: string
  ): Promise<void> {
    try {
      const email = overrideEmail ?? (order.customer as AccountDocument)?.email;
      if (!email) return;
      const { MailService } = await import("@/utils/mail/mail.service");
      const mailService = Container.get(MailService);
      await mailService.sendOrderConfirmationMail(email, order);
    } catch (err) {
      console.error("Failed to send order confirmation email:", err);
    }
  }
}

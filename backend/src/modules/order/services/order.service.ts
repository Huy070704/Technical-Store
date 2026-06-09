import { Service } from "typedi";
import { EntityManager } from "typeorm";
import { Order, OrderStatus } from "../order.entity";
import { OrderDetail } from "../orderDetail.entity";
import { CreateOrderDto, PaymentMethodType } from "../dtos/create-order.dto";
import { UpdateOrderDto } from "../dtos/update-order.dto";
import { calcOrderPricing } from "../utils/order-pricing.util";
import { MAX_CART_LINE_ITEMS } from "@/modules/cart/constants/cart.constants";
import { Cart } from "@/modules/cart/cart.entity";
import { CartItem } from "@/modules/cart/cartItem.entity";
import { CartService } from "@/modules/cart/services/cart.service";
import { Product } from "@/modules/product/product.entity";
import { Account } from "@/modules/auth/account.entity";
import { Invoice, InvoiceStatus } from "@/modules/payment/invoice.entity";
import { Payment } from "@/modules/payment/payment.entity";
import {
  BadRequestException,
  EntityNotFoundException,
  ForbiddenException,
} from "@/shared/exceptions/http-exceptions";
import { DbConnection } from "@/database/dbConnection";
import { Container } from "typedi";
import { OtpService } from "@/modules/otp/services/otp.service";
import {
  isValidVnPhone,
  normalizeVnPhone,
} from "@/shared/validators/vietnam-phone";

const ORDER_RELATIONS = [
  "customer",
  "customer.role",
  "orderDetails",
  "orderDetails.product",
  "orderDetails.product.category",
  "orderDetails.product.images",
  "payments",
  "invoices",
] as const;

@Service()
export class OrderService {
  constructor(private readonly otpService: OtpService) {}

  private validateStatusTransition(
    current: OrderStatus,
    next: OrderStatus
  ): boolean {
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

  async createOrder(
    accountId: string,
    dto: CreateOrderDto
  ): Promise<Order> {
    if (!dto.shippingAddress?.trim()) {
      throw new BadRequestException("Địa chỉ giao hàng không được để trống");
    }

    const savedOrder = await this.runTransaction(async (manager) => {
      const account = await manager.findOne(Account, {
        where: { id: accountId },
        relations: ["role"],
      });
      if (!account) {
        throw new EntityNotFoundException("Account");
      }

      const cart = await manager.findOne(Cart, {
        where: { account: { id: accountId } },
        relations: [
          "cartItems",
          "cartItems.product",
          "cartItems.product.category",
          "cartItems.product.images",
        ],
      });

      if (!cart?.cartItems?.length) {
        throw new BadRequestException(
          "Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi đặt hàng."
        );
      }

      let lines = cart.cartItems;
      if (dto.selectedProductIds?.length) {
        const selected = new Set(dto.selectedProductIds);
        lines = lines.filter((line) => selected.has(line.product.id));
        if (!lines.length) {
          throw new BadRequestException(
            "Không có sản phẩm được chọn để thanh toán"
          );
        }
      }

      await this.validateAndLockLines(manager, lines);

      const subtotal = lines.reduce(
        (sum, line) => sum + Number(line.product.price) * line.quantity,
        0
      );
      const pricing = calcOrderPricing(subtotal);
      const now = new Date();

      const order = await this.persistOrder(manager, {
        customer: account,
        dto,
        pricing,
        now,
      });

      await this.createOrderDetailsAndDeductStock(manager, lines, order);
      await this.createInvoiceAndPayment(manager, order, dto.paymentMethod, now);

      const selectedIds = new Set(lines.map((l) => l.product.id));
      const remaining = cart.cartItems.filter(
        (l) => !selectedIds.has(l.product.id)
      );
      if (remaining.length < cart.cartItems.length) {
        const toRemove = cart.cartItems.filter((l) =>
          selectedIds.has(l.product.id)
        );
        if (toRemove.length) {
          await manager.remove(toRemove);
        }
        cart.cartItems = remaining;
        const cartService = Container.get(CartService);
        cart.totalAmount = await this.recalcCartTotal(manager, remaining);
        await manager.save(cart);
      }

      return this.loadOrder(manager, order.id);
    });

    if (dto.paymentMethod !== PaymentMethodType.ONLINE) {
      await this.sendConfirmationEmail(savedOrder);
    }
    return savedOrder;
  }

  async createGuestOrder(dto: CreateOrderDto): Promise<Order> {
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
      throw new BadRequestException(
        `Giỏ hàng vượt quá ${MAX_CART_LINE_ITEMS} sản phẩm`
      );
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

    const savedOrder = await this.runTransaction(async (manager) => {
      const productIds = dto.guestCartItems!.map((i) => i.productId);
      const products = await manager
        .createQueryBuilder(Product, "product")
        .setLock("pessimistic_write")
        .where("product.id IN (:...ids)", { ids: productIds })
        .getMany();

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
        throw new BadRequestException(
          `Tồn kho không đủ: ${stockIssues.join(", ")}`
        );
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

      const order = await this.persistOrder(manager, {
        customer: null,
        dto: { ...dto, note: guestNote },
        pricing,
        now,
      });

      for (const item of dto.guestCartItems!) {
        const product = products.find((p) => p.id === item.productId)!;
        const detail = new OrderDetail();
        detail.order = order;
        detail.product = product;
        detail.quantity = item.quantity;
        detail.price = Number(product.price);
        await manager.save(detail);

        product.stock = (product.stock ?? 0) - item.quantity;
        await manager.save(product);
      }

      await this.createInvoiceAndPayment(manager, order, dto.paymentMethod, now);
      return this.loadOrder(manager, order.id);
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
  ): Promise<{ orders: Order[]; total: number }> {
    const offset = (page - 1) * limit;
    const [orders, total] = await Order.findAndCount({
      where: { customer: { id: accountId } },
      relations: [...ORDER_RELATIONS],
      order: { orderDate: "DESC" },
      skip: offset,
      take: limit,
    });
    return { orders, total };
  }

  async getOrderStatistics(accountId: string) {
    const base = Order.createQueryBuilder("order")
      .leftJoin("order.customer", "customer")
      .where("customer.id = :accountId", { accountId });

    const [total, pending, shipping, delivered, cancelled] = await Promise.all([
      base.getCount(),
      base
        .clone()
        .andWhere("order.status = :s", { s: OrderStatus.PENDING })
        .getCount(),
      base
        .clone()
        .andWhere("order.status = :s", { s: OrderStatus.SHIPPING })
        .getCount(),
      base
        .clone()
        .andWhere("order.status = :s", { s: OrderStatus.DELIVERED })
        .getCount(),
      base
        .clone()
        .andWhere("order.status = :s", { s: OrderStatus.CANCELLED })
        .getCount(),
    ]);

    return { total, pending, shipping, delivered, cancelled };
  }

  async getOrderById(orderId: string, accountId?: string): Promise<Order> {
    const order = await Order.findOne({
      where: { id: orderId },
      relations: [...ORDER_RELATIONS],
    });
    if (!order) {
      throw new EntityNotFoundException("Order");
    }
    if (accountId && order.customer?.id !== accountId) {
      throw new ForbiddenException("Bạn không có quyền xem đơn hàng này");
    }
    return order;
  }

  async updateOrderStatus(
    orderId: string,
    accountId: string,
    dto: UpdateOrderDto
  ): Promise<Order> {
    const order = await Order.findOne({
      where: { id: orderId },
      relations: ["customer", "orderDetails", "orderDetails.product"],
    });
    if (!order) {
      throw new EntityNotFoundException("Order");
    }
    if (order.customer?.id !== accountId) {
      throw new ForbiddenException("Bạn không có quyền cập nhật đơn hàng này");
    }

    if (!this.validateStatusTransition(order.status, dto.status)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái từ ${order.status} sang ${dto.status}`
      );
    }

    const oldStatus = order.status;

    await this.runTransaction(async (manager) => {
      if (
        dto.status === OrderStatus.CANCELLED &&
        [OrderStatus.PENDING, OrderStatus.ASSIGNED, OrderStatus.PROCESSING].includes(
          oldStatus
        )
      ) {
        for (const detail of order.orderDetails) {
          const product = await manager.findOne(Product, {
            where: { id: detail.product.id },
            lock: { mode: "pessimistic_write" },
          });
          if (product) {
            product.stock = (product.stock ?? 0) + detail.quantity;
            await manager.save(product);
          }
        }
      }

      const toUpdate = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: "pessimistic_write" },
      });
      if (!toUpdate) {
        throw new EntityNotFoundException("Order");
      }
      toUpdate.status = dto.status;
      if (dto.cancelReason) {
        toUpdate.cancelReason = dto.cancelReason;
      }
      await manager.save(toUpdate);
    });

    return this.getOrderById(orderId, accountId);
  }

  async confirmDelivery(orderId: string, accountId: string): Promise<Order> {
    return this.updateOrderStatus(orderId, accountId, {
      status: OrderStatus.DELIVERED,
    });
  }

  private async persistOrder(
    manager: EntityManager,
    opts: {
      customer: Account | null;
      dto: CreateOrderDto;
      pricing: ReturnType<typeof calcOrderPricing>;
      now: Date;
    }
  ): Promise<Order> {
    const { customer, dto, pricing, now } = opts;
    const order = new Order();
    order.customer = customer;
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
    return manager.save(order);
  }

  private async createOrderDetailsAndDeductStock(
    manager: EntityManager,
    lines: CartItem[],
    order: Order
  ): Promise<void> {
    const productIds = lines.map((l) => l.product.id);
    const products = await manager
      .createQueryBuilder(Product, "product")
      .setLock("pessimistic_write")
      .where("product.id IN (:...ids)", { ids: productIds })
      .getMany();

    for (const line of lines) {
      const product = products.find((p) => p.id === line.product.id)!;
      const detail = new OrderDetail();
      detail.order = order;
      detail.product = product;
      detail.quantity = line.quantity;
      detail.price = Number(product.price);
      await manager.save(detail);

      product.stock = (product.stock ?? 0) - line.quantity;
      await manager.save(product);
    }
  }

  private async createInvoiceAndPayment(
    manager: EntityManager,
    order: Order,
    paymentMethod: PaymentMethodType,
    now: Date
  ): Promise<void> {
    const invoiceNumber = `INV${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getTime()).slice(-6)}`;

    const invoice = new Invoice();
    invoice.order = order;
    invoice.invoiceNumber = invoiceNumber;
    invoice.totalAmount = order.totalAmount;
    invoice.paymentMethod = paymentMethod === PaymentMethodType.ONLINE ? "PAYOS" : "COD";
    invoice.status = InvoiceStatus.UNPAID;
    invoice.notes = `Hóa đơn cho đơn ${order.id}`;
    await manager.save(invoice);

    if (paymentMethod === PaymentMethodType.ONLINE) {
      const payment = new Payment();
      payment.order = order;
      payment.amount = order.totalAmount;
      payment.status = "pending";
      payment.method = "PAYOS";
      await manager.save(payment);
    }
  }

  private async validateAndLockLines(
    manager: EntityManager,
    lines: CartItem[]
  ): Promise<void> {
    const productIds = lines.map((l) => l.product.id);
    const products = await manager
      .createQueryBuilder(Product, "product")
      .setLock("pessimistic_write")
      .where("product.id IN (:...ids)", { ids: productIds })
      .getMany();

    const issues: string[] = [];
    for (const line of lines) {
      const product = products.find((p) => p.id === line.product.id);
      if (!product) {
        issues.push(`${line.product.name} (không tồn tại)`);
        continue;
      }
      if (!product.isActive) {
        issues.push(`${product.name} (ngừng kinh doanh)`);
      } else if ((product.stock ?? 0) < line.quantity) {
        issues.push(
          `${product.name} (tồn: ${product.stock}, cần: ${line.quantity})`
        );
      }
      if (Number(product.price) !== Number(line.product.price)) {
        issues.push(
          `${product.name} (giá đã đổi: ${line.product.price} → ${product.price})`
        );
      }
    }
    if (issues.length) {
      throw new BadRequestException(
        `Giỏ hàng không hợp lệ: ${issues.join("; ")}`
      );
    }
  }

  private async loadOrder(
    manager: EntityManager,
    orderId: string
  ): Promise<Order> {
    const order = await manager.findOne(Order, {
      where: { id: orderId },
      relations: [...ORDER_RELATIONS],
    });
    if (!order) {
      throw new Error("Không tải được đơn hàng vừa tạo");
    }
    return order;
  }

  private async recalcCartTotal(
    manager: EntityManager,
    lines: CartItem[]
  ): Promise<number> {
    if (!lines.length) return 0;
    let total = 0;
    for (const line of lines) {
      const product = await manager.findOne(Product, {
        where: { id: line.product.id },
      });
      if (product) {
        total += Number(product.price) * line.quantity;
      }
    }
    return Number(total.toFixed(2));
  }

  private async sendConfirmationEmail(
    order: Order,
    overrideEmail?: string
  ): Promise<void> {
    try {
      const email =
        overrideEmail ?? order.customer?.email;
      if (!email) return;
      const { MailService } = await import("@/utils/mail/mail.service");
      const mailService = Container.get(MailService);
      await mailService.sendOrderConfirmationMail(email, order);
    } catch (err) {
      console.error("Failed to send order confirmation email:", err);
    }
  }

  private runTransaction<T>(
    work: (manager: EntityManager) => Promise<T>
  ): Promise<T> {
    const ds = DbConnection.appDataSource;
    if (!ds?.isInitialized) {
      throw new Error("Database connection not available");
    }
    return ds.transaction(work);
  }
}

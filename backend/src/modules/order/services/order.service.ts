import { Service } from "typedi";
import { ClientSession, Types } from "mongoose";
import { Order, OrderDocument, OrderStatus } from "../models/order.model";
import { OrderDetail } from "../models/orderDetail.model";
import {
  CreateOrderInput as CreateOrderDto,
  UpdateOrderInput as UpdateOrderDto,
  CreateInStoreOrderInput as CreateInStoreOrderDto,
  PaymentMethodType,
} from "../schemas/order.schemas";
import { calcOrderPricing } from "../utils/order-pricing.util";
import { MAX_CART_LINE_ITEMS } from "../../cart/models/cart.model";
import { Cart } from "../../cart/models/cart.model";
import { CartItem, CartItemDocument } from "../../cart/models/cartItem.model";
import { Product, ProductDocument } from "../../product/models/product.model";
import { Account, AccountDocument } from "../../auth/models/account.model";
import { Invoice, InvoiceStatus } from "../../payment/models/invoice.model";
import {
  Payment,
  PaymentStatus,
  isPaidStatus,
  normalizePaymentStatus,
} from "../../payment/models/payment.model";
import { Facility } from "../../facility/models/facility.model";
import { Inventory } from "../../inventory/models/inventory.model";
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

/** Các quan hệ cần populate cho một Order đầy đủ. */
const ORDER_POPULATE = [
  { path: "customerIdOrder", populate: { path: "role" } },
  { path: "staffIdOrder", populate: { path: "role" } },
  { path: "facility" },
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

/**
 * Một payment được coi là đã thanh toán (PaymentStatus.PAID sau chuẩn hóa).
 * Chấp nhận cả dữ liệu cũ ("completed").
 */
const isPaidPayment = (p: { status?: string }): boolean =>
  isPaidStatus(p.status);

const isPrepaidOrder = (paymentMethod?: string | null): boolean =>
  ["ONLINE", "PAYOS"].includes(String(paymentMethod ?? "").toUpperCase());

@Service()
export class OrderService {
  private static readonly facilityAssignmentInFlight = new Map<
    string,
    Promise<Types.ObjectId | null>
  >();

  constructor(private readonly otpService: OtpService) {}

  // ─── Status transition guard ───────────────────────────────────────────────

  private validateStatusTransition(
    current: OrderStatus,
    next: OrderStatus,
  ): boolean {
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [
        OrderStatus.SHIPPING,
        OrderStatus.CANCELLED,
        OrderStatus.SUCCESSFUL,
      ],
      [OrderStatus.SHIPPING]: [
        OrderStatus.DELIVERED,
        OrderStatus.DELIVERY_FAILED,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.DELIVERED]: [],
      [OrderStatus.DELIVERY_FAILED]: [
        OrderStatus.SHIPPING,
        OrderStatus.CANCELLED,
      ],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.SUCCESSFUL]: [],
    };
    return (allowed[current] ?? []).includes(next);
  }

  // ─── Customer: create order ────────────────────────────────────────────────

  async createOrder(
    accountId: string,
    dto: CreateOrderDto,
  ): Promise<OrderDocument> {
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
          "Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi đặt hàng.",
        );
      }

      let lines = cart.cartItems;
      if (dto.selectedProductIds?.length) {
        const selected = new Set(dto.selectedProductIds);
        lines = lines.filter((line) =>
          selected.has((line.product as ProductDocument).id),
        );
        if (!lines.length) {
          throw new BadRequestException(
            "Không có sản phẩm được chọn để thanh toán",
          );
        }
      }

      await this.validateAndLockLines(session, lines);

      const subtotal = lines.reduce(
        (sum, line) =>
          sum + Number((line.product as ProductDocument).price) * line.quantity,
        0,
      );
      const pricing = calcOrderPricing(subtotal, dto.shippingAddress);
      const now = new Date();

      const order = await this.persistOrder(session, {
        customer: account,
        dto,
        pricing,
        now,
      });

      await this.createOrderDetails(session, lines, order);
      await this.createInvoiceAndPayment(
        session,
        order,
        dto.paymentMethod,
        now,
        pricing.vatAmount,
      );

      const selectedIds = new Set(
        lines.map((l) => (l.product as ProductDocument).id),
      );
      const remaining = cart.cartItems.filter(
        (l) => !selectedIds.has((l.product as ProductDocument).id),
      );
      if (remaining.length < cart.cartItems.length) {
        const toRemove = cart.cartItems.filter((l) =>
          selectedIds.has((l.product as ProductDocument).id),
        );
        if (toRemove.length) {
          await CartItem.deleteMany(
            { _id: { $in: toRemove.map((l) => l._id) } },
            { session: session ?? undefined },
          );
        }
        cart.cartItems = remaining;
        cart.totalAmount = await this.recalcCartTotal(session, remaining);
        await cart.save({ session: session ?? undefined });
      }

      return this.loadOrder(session, order._id.toString());
    });

    this.assignFacilityInBackground(savedOrder.id);

    // Gửi email xác nhận chạy ngầm — không giữ request tạo đơn phải chờ SMTP.
    if (dto.paymentMethod !== PaymentMethodType.ONLINE) {
      this.sendConfirmationEmailInBackground(savedOrder);
    }
    return savedOrder;
  }

  async createGuestOrder(dto: CreateOrderDto): Promise<OrderDocument> {
    if (!dto.guestInfo) {
      throw new BadRequestException("Thông tin khách hàng là bắt buộc");
    }
    if (!dto.guestOtp?.trim()) {
      throw new BadRequestException(
        "Vui lòng xác thực email bằng OTP trước khi đặt hàng",
      );
    }
    if (!dto.guestCartItems?.length) {
      throw new BadRequestException("Giỏ hàng khách không được trống");
    }
    if (dto.guestCartItems.length > MAX_CART_LINE_ITEMS) {
      throw new BadRequestException(
        `Giỏ hàng vượt quá ${MAX_CART_LINE_ITEMS} sản phẩm`,
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

    const otpResult = await this.otpService.checkVerifiedOtp(
      email.trim().toLowerCase(),
      dto.guestOtp,
    );
    this.otpService.assertOtpVerified(otpResult);

    const savedOrder = await runInTransaction(async (session) => {
      const productIds = dto.guestCartItems!.map((i) => i.productId);
      const products = await Product.find({ _id: { $in: productIds } }).session(
        session ?? null,
      );

      const priceIssues: string[] = [];
      const inactiveIssues: string[] = [];
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
          inactiveIssues.push(`${product.name}`);
          continue;
        }
        // Kiểm tra tồn kho thực tế (tổng tồn trên các cơ sở). Bỏ qua nếu sản phẩm chưa gắn kho.
        const inventories = await Inventory.find({
          product: product._id,
        }).session(session ?? null);
        if (inventories.length) {
          const totalStock = inventories.reduce(
            (s, inv) => s + (inv.quantity ?? 0),
            0,
          );
          if (totalStock < item.quantity) {
            stockIssues.push(`${product.name} (còn ${totalStock})`);
          }
        }
      }

      if (priceIssues.length) {
        throw new BadRequestException(
          `Giá sản phẩm đã thay đổi: ${priceIssues.join(", ")}`,
        );
      }
      if (inactiveIssues.length) {
        throw new BadRequestException(
          `Sản phẩm ngừng kinh doanh: ${inactiveIssues.join(", ")}`,
        );
      }
      if (stockIssues.length) {
        throw new BadRequestException(
          `Tồn kho không đủ: ${stockIssues.join(", ")}`,
        );
      }

      const subtotal = dto.guestCartItems!.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId)!;
        return sum + Number(product.price) * item.quantity;
      }, 0);

      const pricing = calcOrderPricing(subtotal, dto.shippingAddress);
      const now = new Date();

      const order = await this.persistOrder(session, {
        customer: null,
        dto,
        pricing,
        now,
      });

      for (const item of dto.guestCartItems!) {
        const product = products.find((p) => p.id === item.productId)!;
        const detail = new OrderDetail();
        detail.order = order._id;
        detail.product = product._id;
        detail.quantity = item.quantity;
        detail.unitPrice = Number(product.price);
        await detail.save({ session: session ?? undefined });
      }

      await this.createInvoiceAndPayment(
        session,
        order,
        dto.paymentMethod,
        now,
        pricing.vatAmount,
      );
      return this.loadOrder(session, order._id.toString());
    });

    this.assignFacilityInBackground(savedOrder.id);

    // Xóa OTP sau khi đặt hàng thành công để ngăn tái sử dụng trong TTL
    await this.otpService.invalidateOtp(dto.guestInfo.email, dto.guestOtp!);

    if (dto.paymentMethod !== PaymentMethodType.ONLINE && dto.guestInfo.email) {
      this.sendConfirmationEmailInBackground(savedOrder, dto.guestInfo.email);
    }
    return savedOrder;
  }

  // ─── Staff: create in-store order ─────────────────────────────────────────

  async createInStoreOrder(
    dto: CreateInStoreOrderDto,
    staffId: string,
  ): Promise<OrderDocument> {
    if (!dto.items?.length) {
      throw new BadRequestException("Danh sách sản phẩm không được trống");
    }

    return runInTransaction(async (session) => {
      const staff = await Account.findById(staffId).session(session ?? null);
      if (!staff)
        throw new BadRequestException("Không tìm thấy thông tin nhân viên");

      const productIds = dto.items.map((i) => i.productId);
      const products = await Product.find({ _id: { $in: productIds } }).session(
        session ?? null,
      );

      const facilityId = staff.facility
        ? (staff.facility as Types.ObjectId).toString()
        : null;

      // Kiểm tra tồn kho tại cơ sở
      const issues: string[] = [];
      for (const item of dto.items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          issues.push(`Sản phẩm ${item.productId} không tồn tại`);
          continue;
        }
        if (!product.isActive) {
          issues.push(`${product.name} (ngừng kinh doanh)`);
          continue;
        }
        if (facilityId) {
          const inv = await Inventory.findOne({
            facility: facilityId,
            product: product._id,
          }).session(session ?? null);
          if (!inv || inv.quantity < item.quantity) {
            issues.push(
              `${product.name}: chỉ còn ${inv?.quantity ?? 0} sản phẩm tại kho`,
            );
          }
        }
      }
      if (issues.length) {
        throw new BadRequestException(`Tồn kho không đủ: ${issues.join("; ")}`);
      }

      const subtotal = dto.items.reduce((sum, item) => {
        const product = products.find((p) => p.id === item.productId)!;
        return sum + Number(product.price) * item.quantity;
      }, 0);

      const totalAmount = Number(subtotal.toFixed(2));
      const vatAmount = Number((totalAmount * 0.1).toFixed(2));
      const now = new Date();

      const order = new Order();
      order.customerIdOrder = null;
      order.staffIdOrder = staff._id;
      order.facility = (staff.facility as Types.ObjectId) ?? null;
      order.orderAt = now;
      order.status = OrderStatus.PROCESSING;
      order.orderType = 2;
      order.totalAmount = totalAmount + vatAmount;
      order.subtotalAmount = totalAmount;
      order.shippingFee = 0;
      order.vatAmount = vatAmount;
      order.requireInvoice = true;
      order.shippingAddress = undefined;
      order.note = dto.note?.trim() ?? "";
      order.paymentMethod = dto.paymentMethod;
      order.completedAt = null;
      order.cancelReason = undefined;
      order.cancelAt = null;
      order.confirmedAt = null;
      order.guestAddress = null;
      order.guestEmail = null;
      if (dto.guestName?.trim()) order.guestName = dto.guestName.trim();
      if (dto.guestPhone?.trim()) order.guestPhone = dto.guestPhone.trim();
      await order.save({ session: session ?? undefined });

      for (const item of dto.items) {
        const product = products.find((p) => p.id === item.productId)!;
        const detail = new OrderDetail();
        detail.order = order._id;
        detail.product = product._id;
        detail.quantity = item.quantity;
        detail.unitPrice = Number(product.price);
        await detail.save({ session: session ?? undefined });

        // Trừ tồn kho tại cơ sở
        if (facilityId) {
          await Inventory.findOneAndUpdate(
            { facility: facilityId, product: product._id },
            { $inc: { quantity: -item.quantity } },
            { session: session ?? undefined },
          );
        }
      }

      return this.loadOrder(session, order._id.toString());
    });
  }

  // ─── Staff: hoàn tất đơn tại quầy (thu tiền mặt) ─────────────────────────

  async completeInStoreOrder(orderId: string): Promise<OrderDocument> {
    const order = await Order.findById(orderId);
    if (!order) throw new EntityNotFoundException("Order");
    if (order.orderType !== 2)
      throw new BadRequestException("Không phải đơn hàng tại quầy");
    if (order.status !== OrderStatus.PROCESSING) {
      throw new BadRequestException(
        `Đơn hàng không ở trạng thái chờ thanh toán (hiện tại: ${order.status})`,
      );
    }
    // Endpoint này dùng để xác nhận thanh toán tiền mặt cho đơn tại quầy.
    // Nhân viên được phép đổi phương thức từ TRANSFER sang CASH (khi khách đổi ý).

    const now = new Date();
    const invoiceNumber = `INV${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getTime()).slice(-6)}`;

    await runInTransaction(async (session) => {
      // Nếu đơn ban đầu là TRANSFER nhưng khách thanh toán tiền mặt:
      // hủy link PayOS cũ và cập nhật phương thức thanh toán
      if (order.paymentMethod === "TRANSFER") {
        const pendingPayment = await Payment.findOne({
          order: order._id,
          status: "PENDING",
        }).session(session ?? null);
        if (pendingPayment && pendingPayment.payosOrderCode) {
          try {
            const { payos } = await import("@/utils/payos");
            await payos.cancelPaymentLink(
              Number(pendingPayment.payosOrderCode),
              "Khách thanh toán tiền mặt thay vì chuyển khoản",
            );
            pendingPayment.status = PaymentStatus.CANCELLED;
            await pendingPayment.save({ session: session ?? undefined });
          } catch (err) {
            console.error("Lỗi hủy link PayOS khi chuyển sang tiền mặt:", err);
          }
        }
        order.paymentMethod = "CASH";
      }

      const invoice = new Invoice();
      invoice.order = order._id;
      invoice.invoiceNumber = invoiceNumber;
      invoice.totalAmount = order.totalAmount;
      invoice.status = InvoiceStatus.PAID;
      invoice.paymentMethod = "CASH";
      invoice.paidAt = now;
      invoice.taxAmount = order.vatAmount ?? 0;
      invoice.notes = "Thanh toán tiền mặt tại quầy";
      await invoice.save({ session: session ?? undefined });

      const payment = new Payment();
      payment.order = order._id;
      payment.amount = order.totalAmount;
      payment.status = PaymentStatus.PAID;
      payment.method = "CASH";
      payment.paidAt = now;
      await payment.save({ session: session ?? undefined });

      order.status = OrderStatus.SUCCESSFUL;
      order.completedAt = now;
      order.confirmedAt = now;
      await order.save({ session: session ?? undefined });
    });

    return this.getOrderById(orderId);
  }

  // ─── Guest: tra cứu đơn hàng theo email + orderId ─────────────────────────

  async getGuestOrder(orderId: string, email: string): Promise<OrderDocument> {
    const order = await Order.findById(orderId).populate(ORDER_POPULATE as any);
    if (!order) throw new EntityNotFoundException("Order");

    if (order.customerIdOrder) {
      throw new ForbiddenException("Đây không phải đơn hàng khách vãng lai");
    }

    if (
      !order.guestEmail ||
      order.guestEmail.trim().toLowerCase() !== email.trim().toLowerCase()
    ) {
      throw new ForbiddenException("Email không khớp với đơn hàng");
    }

    return order;
  }

  // ─── Customer: read orders ────────────────────────────────────────────────

  async getOrdersByCustomer(
    accountId: string,
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<{ orders: OrderDocument[]; total: number }> {
    const offset = (page - 1) * limit;
    const filter: Record<string, unknown> = { customerIdOrder: accountId };
    if (status && status !== "all") {
      filter.status = status;
    }
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate(ORDER_POPULATE as any)
        .sort({ orderAt: -1 })
        .skip(offset)
        .limit(limit),
      Order.countDocuments(filter),
    ]);
    return { orders, total };
  }

  async getOrderStatistics(accountId: string) {
    const [total, pending, processing, shipping, delivered, cancelled] =
      await Promise.all([
        Order.countDocuments({ customerIdOrder: accountId }),
        Order.countDocuments({
          customerIdOrder: accountId,
          status: OrderStatus.PENDING,
        }),
        Order.countDocuments({
          customerIdOrder: accountId,
          status: OrderStatus.PROCESSING,
        }),
        Order.countDocuments({
          customerIdOrder: accountId,
          status: OrderStatus.SHIPPING,
        }),
        Order.countDocuments({
          customerIdOrder: accountId,
          status: OrderStatus.DELIVERED,
        }),
        Order.countDocuments({
          customerIdOrder: accountId,
          status: OrderStatus.CANCELLED,
        }),
      ]);

    return { total, pending, processing, shipping, delivered, cancelled };
  }

  async getOrderById(
    orderId: string,
    accountId?: string,
  ): Promise<OrderDocument> {
    const order = await Order.findById(orderId).populate(ORDER_POPULATE as any);
    if (!order) {
      throw new EntityNotFoundException("Order");
    }
    if (
      accountId &&
      (order.customerIdOrder as AccountDocument)?.id !== accountId
    ) {
      throw new ForbiddenException("Bạn không có quyền xem đơn hàng này");
    }
    return order;
  }

  async updateOrderStatus(
    orderId: string,
    accountId: string,
    dto: UpdateOrderDto,
  ): Promise<OrderDocument> {
    const order = await Order.findById(orderId).populate([
      { path: "customerIdOrder" },
      { path: "orderDetails", populate: { path: "product" } },
    ] as any);
    if (!order) {
      throw new EntityNotFoundException("Order");
    }
    if (
      accountId &&
      (order.customerIdOrder as AccountDocument)?.id !== accountId
    ) {
      throw new ForbiddenException("Bạn không có quyền cập nhật đơn hàng này");
    }

    // Customer chỉ được phép HỦY hoặc XÁC NHẬN ĐÃ NHẬN đơn của mình,
    // không được tự đẩy đơn qua các trạng thái nghiệp vụ khác (PROCESSING/SHIPPING/...).
    const CUSTOMER_ALLOWED_STATUSES: OrderStatus[] = [
      OrderStatus.CANCELLED,
      OrderStatus.DELIVERED,
    ];
    if (!CUSTOMER_ALLOWED_STATUSES.includes(dto.status)) {
      throw new ForbiddenException(
        "Bạn không có quyền chuyển đơn hàng sang trạng thái này",
      );
    }
    // Chỉ cho phép huỷ khi đơn CHƯA được nhân viên xác nhận (chưa trừ kho).
    if (
      dto.status === OrderStatus.CANCELLED &&
      order.status !== OrderStatus.PENDING
    ) {
      throw new BadRequestException(
        "Đơn hàng đã được xử lý. Vui lòng liên hệ nhân viên để huỷ đơn.",
      );
    }

    if (!this.validateStatusTransition(order.status, dto.status)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái từ ${order.status} sang ${dto.status}`,
      );
    }

    await runInTransaction(async (session) => {
      // Không cần hoàn kho ở đây: customer chỉ huỷ được đơn PENDING (chưa trừ kho).
      // Việc hoàn kho khi huỷ đơn đã trừ kho do nhân viên xử lý ở staffCancelOrder().
      const toUpdate = await Order.findById(orderId).session(session ?? null);
      if (!toUpdate) {
        throw new EntityNotFoundException("Order");
      }
      toUpdate.status = dto.status;
      if (dto.cancelReason) {
        toUpdate.cancelReason = dto.cancelReason;
      }
      if (dto.status === OrderStatus.CANCELLED) {
        toUpdate.cancelAt = new Date();

        // Huỷ link PayOS còn mở (nếu có) để khách không lỡ quét QR trả tiền cho đơn
        // đã huỷ — khi đó webhook sẽ bỏ qua đơn CANCELLED và tiền không tự hoàn.
        // Đồng thời đánh dấu các payment PENDING của đơn là CANCELLED.
        const pendingPayment = await Payment.findOne({
          order: toUpdate._id,
          status: "PENDING",
        }).session(session ?? null);
        if (pendingPayment?.payosOrderCode) {
          try {
            const { payos } = await import("@/utils/payos");
            await payos.cancelPaymentLink(
              Number(pendingPayment.payosOrderCode),
              "Đơn hàng bị huỷ bởi khách hàng",
            );
          } catch (err) {
            console.error("Lỗi khi huỷ link PayOS (customer huỷ đơn):", err);
          }
        }
        await Payment.updateMany(
          { order: toUpdate._id, status: "PENDING" },
          { $set: { status: PaymentStatus.CANCELLED } },
          { session: session ?? undefined },
        );
        await Invoice.updateMany(
          { order: toUpdate._id, status: InvoiceStatus.UNPAID },
          { $set: { status: InvoiceStatus.CANCELLED } },
          { session: session ?? undefined },
        );
      } else if (dto.status === OrderStatus.PROCESSING) {
        toUpdate.confirmedAt = new Date();
      } else if (dto.status === OrderStatus.DELIVERED) {
        toUpdate.completedAt = new Date();
      }
      await toUpdate.save({ session: session ?? undefined });
    });

    return this.getOrderById(orderId, accountId);
  }

  async confirmDelivery(
    orderId: string,
    accountId: string,
  ): Promise<OrderDocument> {
    const order = await Order.findById(orderId)
      .populate("payments")
      .populate("invoices")
      .populate("customerIdOrder");
    if (!order) {
      throw new EntityNotFoundException("Order");
    }
    if (
      accountId &&
      (order.customerIdOrder as AccountDocument)?.id !== accountId
    ) {
      throw new ForbiddenException("Bạn không có quyền cập nhật đơn hàng này");
    }
    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException(
        "Chỉ có thể xác nhận đã nhận hàng khi đơn đang được giao (SHIPPING).",
      );
    }

    // Khách xác nhận đã nhận hàng == giao thành công: chạy cùng logic thu COD
    // và mark invoice PAID như nhân viên, tránh đơn "Đã giao" nhưng "Chưa thanh toán".
    await this.completeDeliveryWithSettlement(order);

    return this.getOrderById(orderId, accountId);
  }

  // ─── Staff: read & manage orders ──────────────────────────────────────────

  async getOrders(
    page: number,
    limit: number,
    status?: string,
    facilityId?: string,
    orderType?: number,
    startDate?: string,
    endDate?: string,
    search?: string,
  ): Promise<{
    data: OrderDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    const filter: any = {};
    if (status) {
      const list = status
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (list.length === 1) filter.status = list[0];
      else if (list.length > 1) filter.status = { $in: list };
    }
    // Lọc theo cơ sở của staff (admin/manager không có facility sẽ thấy tất cả)
    if (facilityId) {
      filter.facility = facilityId;
    }
    if (orderType !== undefined) {
      filter.orderType = Number(orderType);
    }
    if (startDate || endDate) {
      filter.orderAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.orderAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.orderAt.$lte = end;
      }
    }
    if (search?.trim()) {
      const kw = search.trim();
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      const matchingAccounts = await Account.find({
        $or: [{ name: regex }, { phone: regex }],
      }).select("_id");
      const orConditions: any[] = [
        { guestName: regex },
        { guestPhone: regex },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: escaped,
              options: "i",
            },
          },
        },
      ];
      if (matchingAccounts.length) {
        orConditions.push({
          customerIdOrder: { $in: matchingAccounts.map((a) => a._id) },
        });
      }
      filter.$or = orConditions;
    }

    const total = await Order.countDocuments(filter);
    const data = await Order.find(filter)
      .populate(ORDER_POPULATE as any)
      .sort({ orderAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return { data, total, page, limit };
  }

  async confirmOrder(orderId: string): Promise<OrderDocument> {
    const order = await Order.findById(orderId).populate({
      path: "orderDetails",
      populate: { path: "product" },
    } as any);
    if (!order) throw new EntityNotFoundException("Order");

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Chỉ có thể xác nhận đơn hàng ở trạng thái PENDING. Trạng thái hiện tại: ${order.status}`,
      );
    }

    // Đơn ONLINE tự động xử lý qua webhook PayOS, không cần staff xác nhận
    if (order.paymentMethod === "ONLINE") {
      throw new BadRequestException(
        "Đơn hàng online được xử lý tự động sau khi thanh toán. Staff không cần xác nhận thủ công.",
      );
    }

    if (!order.facility) {
      const facilityId = await this.ensureFacilityAssigned(orderId);
      if (!facilityId) {
        throw new BadRequestException(
          "Chưa thể phân cơ sở xử lý đơn hàng. Vui lòng thử lại sau.",
        );
      }
      order.facility = facilityId;
    }

    await runInTransaction(async (session) => {
      // COD: trừ kho khi xác nhận (staff lấy hàng đóng gói)
      // ONLINE: kho đã được trừ trong webhook PayOS, không trừ lại
      if (order.paymentMethod !== "ONLINE") {
        const { Inventory } =
          await import("../../inventory/models/inventory.model");
        const facilityId = order.facility;

        for (const detail of order.orderDetails ?? []) {
          const productId =
            (detail.product as ProductDocument)._id ??
            (detail.product as ProductDocument).id;
          const inv = await Inventory.findOne({
            facility: facilityId,
            product: productId,
          }).session(session ?? null);
          if (!inv || inv.quantity < detail.quantity) {
            const name =
              (detail.product as ProductDocument)?.name ?? String(productId);
            throw new BadRequestException(
              `Tồn kho không đủ cho sản phẩm: ${name}`,
            );
          }
          inv.quantity -= detail.quantity;
          await inv.save({ session: session ?? undefined });
        }
      }

      const toUpdate = await Order.findById(orderId).session(session ?? null);
      if (!toUpdate) throw new EntityNotFoundException("Order");
      toUpdate.status = OrderStatus.PROCESSING;
      toUpdate.confirmedAt = new Date();
      await toUpdate.save({ session: session ?? undefined });
    });

    return this.getOrderById(orderId);
  }

  async collectPayment(
    orderId: string,
    amount: number,
    method: string,
  ): Promise<OrderDocument> {
    const order = await Order.findById(orderId).populate("payments");
    if (!order) throw new EntityNotFoundException("Order");

    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException(
        "Chỉ có thể thu tiền khi đơn hàng đang ở trạng thái SHIPPING.",
      );
    }

    const totalPaid = ((order.payments ?? []) as any[])
      .filter(isPaidPayment)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(order.totalAmount) - totalPaid;

    if (amount <= 0 || amount > remaining + 0.01) {
      throw new BadRequestException(
        `Số tiền không hợp lệ. Số tiền còn phải thu: ${remaining.toLocaleString("vi-VN")} VND.`,
      );
    }

    const payment = new Payment();
    payment.order = order._id;
    payment.amount = amount;
    payment.status = PaymentStatus.PAID;
    payment.method = method;
    payment.paidAt = new Date();
    await payment.save();

    return this.getOrderById(orderId);
  }

  async staffConfirmDelivery(orderId: string): Promise<OrderDocument> {
    const order = await Order.findById(orderId)
      .populate("payments")
      .populate("invoices");
    if (!order) throw new EntityNotFoundException("Order");

    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException(
        "Chỉ có thể xác nhận giao khi đơn đang ở trạng thái SHIPPING.",
      );
    }

    await this.completeDeliveryWithSettlement(order);

    return this.getOrderById(orderId);
  }

  /**
   * Ghi nhận thanh toán khi giao hàng thành công rồi chuyển đơn sang DELIVERED.
   * COD: giao hàng thành công đồng nghĩa với việc đã thu tiền tận tay khách nên
   * tự động tạo/mark Payment PAID cho khoản còn thiếu và mark Invoice PAID, tránh
   * đơn bị kẹt ở trạng thái "Đã giao" nhưng "Chưa thanh toán".
   *
   * Dùng chung cho cả nhân viên (endpoint /deliver) lẫn khách hàng
   * (endpoint /confirm-delivery). Yêu cầu: order đã populate "payments" và
   * "invoices", đang ở trạng thái SHIPPING.
   */
  private async completeDeliveryWithSettlement(
    order: OrderDocument,
  ): Promise<void> {
    let totalPaid = ((order.payments ?? []) as any[])
      .filter(isPaidPayment)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const now = new Date();

    // Chỉ thu COD cho đơn KHÔNG trả trước. Sau khi thanh toán PayOS thành công,
    // paymentMethod của đơn online đã bị đổi từ "ONLINE" → "PAYOS", nên phải dùng
    // isPrepaidOrder() (bao gồm cả ONLINE lẫn PAYOS) thay vì so sánh thẳng "ONLINE".
    if (!isPrepaidOrder(order.paymentMethod)) {
      const remaining = Number(order.totalAmount) - totalPaid;
      if (remaining > 0.01) {
        const codPayment =
          ((order.payments ?? []) as any[]).find(
            (payment) =>
              normalizePaymentStatus(payment.status) === PaymentStatus.PENDING,
          ) ?? new Payment();
        codPayment.order = order._id;
        codPayment.amount = remaining;
        codPayment.status = PaymentStatus.PAID;
        codPayment.method = "COD";
        codPayment.paidAt = now;
        await codPayment.save();
        totalPaid += remaining;
      }
    }

    const isPaid = totalPaid >= Number(order.totalAmount) - 0.01;

    // Đơn đã có invoice tạo lúc đặt hàng (createInvoiceAndPayment) —
    // và với đơn PayOS đã được webhook cập nhật PAID. Tái sử dụng invoice
    // đó thay vì tạo mới để tránh nhân đôi hóa đơn.
    const existingInvoice = ((order.invoices ?? []) as any[])[0];

    if (existingInvoice) {
      // Nếu đã thu đủ mà invoice chưa PAID thì cập nhật; ngược lại giữ nguyên.
      if (isPaid && existingInvoice.status !== InvoiceStatus.PAID) {
        existingInvoice.status = InvoiceStatus.PAID;
        existingInvoice.paidAt = now;
        existingInvoice.paymentMethod =
          order.paymentMethod ?? existingInvoice.paymentMethod ?? null;
        await existingInvoice.save();
      }
    } else {
      const invoiceNumber = `INV${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getTime()).slice(-6)}`;
      const invoice = new Invoice();
      invoice.order = order._id;
      invoice.invoiceNumber = invoiceNumber;
      invoice.totalAmount = order.totalAmount;
      invoice.status = isPaid ? InvoiceStatus.PAID : InvoiceStatus.UNPAID;
      invoice.paymentMethod = order.paymentMethod ?? null;
      invoice.taxAmount = Number(order.totalAmount) * 0.1;
      if (isPaid) invoice.paidAt = now;
      await invoice.save();
    }

    order.status = OrderStatus.DELIVERED;
    order.completedAt = now;
    await order.save();
  }

  async staffCancelOrder(
    orderId: string,
    cancelReason: string,
  ): Promise<OrderDocument> {
    const order = await Order.findById(orderId).populate([
      { path: "orderDetails", populate: { path: "product" } },
    ] as any);
    if (!order) throw new EntityNotFoundException("Order");

    // Đơn PayOS đã thanh toán vẫn cho phép hủy. Khi hủy, Payment/Invoice chuyển
    // CANCELLED; khoản đã thu được nhân viên liên hệ khách hoàn tiền thủ công
    // (chưa gọi API refund PayOS — sẽ bổ sung sau).
    const cancellable = [
      OrderStatus.PENDING,
      OrderStatus.PROCESSING,
      OrderStatus.DELIVERY_FAILED,
    ];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException(
        `Không thể hủy đơn ở trạng thái ${order.status}`,
      );
    }

    await runInTransaction(async (session) => {
      const { Inventory } =
        await import("../../inventory/models/inventory.model");
      // Restore stock only when it was deducted before cancellation.
      if (order.status !== OrderStatus.PENDING) {
        const facilityId = order.facility;
        for (const detail of order.orderDetails ?? []) {
          const productId =
            (detail.product as ProductDocument)._id ??
            (detail.product as ProductDocument).id;
          const inv = await Inventory.findOne({
            facility: facilityId,
            product: productId,
          }).session(session ?? null);
          if (inv) {
            inv.quantity = (inv.quantity ?? 0) + detail.quantity;
            await inv.save({ session: session ?? undefined });
          }
        }
      }

      // Hủy liên kết PayOS nếu có
      const pendingPayment = await Payment.findOne({
        order: order._id,
        status: "PENDING",
      }).session(session ?? null);
      if (pendingPayment && pendingPayment.payosOrderCode) {
        try {
          const { payos } = await import("@/utils/payos");
          await payos.cancelPaymentLink(
            Number(pendingPayment.payosOrderCode),
            "Đơn hàng bị hủy bởi nhân viên",
          );
        } catch (err) {
          console.error("Lỗi khi hủy link PayOS:", err);
        }
      }

      // Hủy toàn bộ payment và invoice của đơn, kể cả bản đã PAID (đơn prepaid).
      // Đơn đã hủy nên khoản đã thu phải hoàn cho khách — nhân viên liên hệ khách
      // xử lý hoàn tiền thủ công (chưa gọi API refund PayOS, sẽ bổ sung sau).
      await Payment.updateMany(
        { order: order._id },
        { $set: { status: PaymentStatus.CANCELLED } },
        { session: session ?? undefined },
      );
      await Invoice.updateMany(
        { order: order._id },
        { $set: { status: InvoiceStatus.CANCELLED } },
        { session: session ?? undefined },
      );

      const toUpdate = await Order.findById(orderId).session(session ?? null);
      if (!toUpdate) throw new EntityNotFoundException("Order");
      toUpdate.status = OrderStatus.CANCELLED;
      toUpdate.cancelReason = cancelReason;
      toUpdate.cancelAt = new Date();
      await toUpdate.save({ session: session ?? undefined });
    });

    return this.getOrderById(orderId);
  }

  async markDeliveryFailed(orderId: string): Promise<OrderDocument> {
    const order = await Order.findById(orderId);
    if (!order) throw new EntityNotFoundException("Order");

    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException(
        `Chỉ có thể đánh dấu giao thất bại khi đơn đang ở trạng thái SHIPPING. Hiện tại: ${order.status}`,
      );
    }

    order.status = OrderStatus.DELIVERY_FAILED;
    await order.save();

    // COD chưa thu tiền nên khi giao thất bại thì hủy luôn và hoàn lại tồn kho.
    // Chỉ đơn prepaid PayOS mới được giữ ở DELIVERY_FAILED để staff giao lại.
    const isPrepaid = isPrepaidOrder(order.paymentMethod);
    if (!isPrepaid) {
      return this.staffCancelOrder(
        orderId,
        "Tự động hủy: giao hàng COD thất bại",
      );
    }

    return this.getOrderById(orderId);
  }

  async redeliverOrder(orderId: string): Promise<OrderDocument> {
    const order = await Order.findById(orderId);
    if (!order) throw new EntityNotFoundException("Order");

    if (order.status !== OrderStatus.DELIVERY_FAILED) {
      throw new BadRequestException(
        `Chỉ có thể giao lại khi đơn ở trạng thái DELIVERY_FAILED. Hiện tại: ${order.status}`,
      );
    }

    const isPrepaid = isPrepaidOrder(order.paymentMethod);
    if (!isPrepaid) {
      throw new BadRequestException(
        "Chỉ đơn prepaid PayOS mới được phép giao lại.",
      );
    }

    order.status = OrderStatus.SHIPPING;
    await order.save();
    return this.getOrderById(orderId);
  }

  async markOrderShipping(orderId: string): Promise<OrderDocument> {
    const order = await Order.findById(orderId);
    if (!order) throw new EntityNotFoundException("Order");

    if (order.status !== OrderStatus.PROCESSING) {
      throw new BadRequestException(
        `Chỉ có thể bàn giao shipper khi đơn ở trạng thái PROCESSING. Trạng thái hiện tại: ${order.status}`,
      );
    }

    order.status = OrderStatus.SHIPPING;
    await order.save();
    return this.getOrderById(orderId);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async persistOrder(
    session: ClientSession | undefined,
    opts: {
      customer: AccountDocument | null;
      dto: CreateOrderDto;
      pricing: ReturnType<typeof calcOrderPricing>;
      now: Date;
    },
  ): Promise<OrderDocument> {
    const { customer, dto, pricing, now } = opts;
    const order = new Order();

    order.customerIdOrder = customer ? customer._id : null;
    order.orderAt = now;
    order.status = OrderStatus.PENDING;
    order.totalAmount = pricing.totalAmount;
    order.subtotalAmount = pricing.subtotalAmount;
    order.shippingFee = pricing.shippingFee;
    order.vatAmount = pricing.vatAmount;
    order.requireInvoice = dto.requireInvoice ?? false;
    order.shippingAddress = dto.shippingAddress.trim();
    order.note = dto.note?.trim() ?? "";
    order.paymentMethod =
      dto.paymentMethod === PaymentMethodType.ONLINE ? "ONLINE" : "COD";

    if (dto.isGuest && dto.guestInfo) {
      order.orderType = 1; // Guest order — online
      order.guestName = dto.guestInfo.fullName.trim();
      order.guestPhone = dto.guestInfo.phone.trim();
      order.guestAddress = dto.shippingAddress.trim();
      order.guestEmail = dto.guestInfo.email.trim().toLowerCase();
    } else {
      order.orderType = 1; // Member order
    }

    await order.save({ session: session ?? undefined });
    return order;
  }

  /**
   * Bắt đầu phân cơ sở nhưng không giữ request tạo đơn/checkout phải chờ.
   * Mọi lỗi đều được ghi log để không tạo unhandled promise rejection.
   */
  private assignFacilityInBackground(orderId: string): void {
    void this.ensureFacilityAssigned(orderId).catch((err) => {
      console.error(
        `[Facility Allocation] Không thể phân cơ sở cho đơn ${orderId}:`,
        err,
      );
    });
  }

  /**
   * Đảm bảo đơn đã có cơ sở trước các nghiệp vụ phụ thuộc vào kho (ví dụ webhook PayOS).
   * Các lời gọi đồng thời trong cùng process dùng chung một Promise để không geocode lặp lại.
   */
  public async ensureFacilityAssigned(
    orderId: string,
  ): Promise<Types.ObjectId | null> {
    const existingRequest =
      OrderService.facilityAssignmentInFlight.get(orderId);
    if (existingRequest) return existingRequest;

    const request = this.assignFacilityToOrder(orderId).finally(() => {
      OrderService.facilityAssignmentInFlight.delete(orderId);
    });
    OrderService.facilityAssignmentInFlight.set(orderId, request);
    return request;
  }

  private async assignFacilityToOrder(
    orderId: string,
  ): Promise<Types.ObjectId | null> {
    const order = await Order.findById(orderId).populate({
      path: "orderDetails",
      populate: { path: "product" },
    } as any);
    if (!order || order.status === OrderStatus.CANCELLED) return null;
    if (order.facility) return order.facility as Types.ObjectId;
    if (!order.shippingAddress?.trim()) return null;

    const orderItems = (order.orderDetails ?? []).map((detail) => ({
      productId: (
        (detail.product as ProductDocument)._id ??
        (detail.product as ProductDocument).id
      ).toString(),
      quantity: detail.quantity,
    }));

    const facility = await this.allocateFacility(
      undefined,
      order.shippingAddress,
      orderItems,
    );
    if (!facility) return null;

    // Chỉ gán nếu một worker khác chưa gán trước đó và đơn chưa bị hủy.
    const updated = await Order.findOneAndUpdate(
      {
        _id: order._id,
        facility: null,
        status: { $ne: OrderStatus.CANCELLED },
      },
      { $set: { facility: facility._id } },
      { new: true },
    );

    const assignedFacility =
      updated?.facility ??
      (await Order.findById(orderId).select("facility"))?.facility;
    return (assignedFacility as Types.ObjectId | null | undefined) ?? null;
  }

  // Lưu ý: KHÔNG trừ kho ở đây. Tồn kho được trừ khi nhân viên xác nhận đơn
  // (confirmOrder) đối với COD, hoặc qua webhook thanh toán đối với ONLINE.
  private async createOrderDetails(
    session: ClientSession | undefined,
    lines: CartItemDocument[],
    order: OrderDocument,
  ): Promise<void> {
    const productIds = lines.map((l) => (l.product as ProductDocument).id);
    const products = await Product.find({ _id: { $in: productIds } }).session(
      session ?? null,
    );

    for (const line of lines) {
      const product = products.find(
        (p) => p.id === (line.product as ProductDocument).id,
      )!;
      const detail = new OrderDetail();
      detail.order = order._id;
      detail.product = product._id;
      detail.quantity = line.quantity;
      detail.unitPrice = Number(product.price);
      await detail.save({ session: session ?? undefined });
    }
  }

  private async createInvoiceAndPayment(
    session: ClientSession | undefined,
    order: OrderDocument,
    paymentMethod: PaymentMethodType,
    now: Date,
    taxAmount: number,
  ): Promise<void> {
    const invoiceNumber = `INV${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getTime()).slice(-6)}`;

    const invoice = new Invoice();
    invoice.order = order._id;
    invoice.invoiceNumber = invoiceNumber;
    invoice.totalAmount = order.totalAmount;
    invoice.paymentMethod =
      paymentMethod === PaymentMethodType.ONLINE ? "PAYOS" : "COD";
    invoice.status = InvoiceStatus.UNPAID;
    invoice.notes = `Hóa đơn cho đơn ${order.id}`;
    invoice.taxAmount = taxAmount;
    await invoice.save({ session: session ?? undefined });

    const payment = new Payment();
    payment.order = order._id;
    payment.amount = order.totalAmount;
    payment.status = PaymentStatus.PENDING;
    payment.method =
      paymentMethod === PaymentMethodType.ONLINE ? "PAYOS" : "COD";
    await payment.save({ session: session ?? undefined });
  }

  private async validateAndLockLines(
    session: ClientSession | undefined,
    lines: CartItemDocument[],
  ): Promise<void> {
    const productIds = lines.map((l) => (l.product as ProductDocument).id);
    const products = await Product.find({ _id: { $in: productIds } }).session(
      session ?? null,
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
      }
    }
    if (issues.length) {
      throw new BadRequestException(
        `Giỏ hàng không hợp lệ: ${issues.join("; ")}`,
      );
    }
  }

  private async loadOrder(
    session: ClientSession | undefined,
    orderId: string,
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
    lines: CartItemDocument[],
  ): Promise<number> {
    if (!lines.length) return 0;
    let total = 0;
    for (const line of lines) {
      const product = await Product.findById(
        (line.product as ProductDocument).id,
      ).session(session ?? null);
      if (product) {
        total += Number(product.price) * line.quantity;
      }
    }
    return Number(total.toFixed(2));
  }

  private async geocodeAddress(
    address: string,
  ): Promise<{ lat: number; lon: number } | null> {
    const addressVariants = this.buildAddressVariants(address);

    for (const variant of addressVariants) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(variant)}&format=json&limit=1&countrycodes=vn`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "TechnicalStore/1.0 (contact@technical-store.com)",
          },
        });
        if (!res.ok) {
          console.warn(`   ⚠️  [Geocode] Nominatim HTTP ${res.status}`);
          continue;
        }

        const data = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (data.length > 0) {
          console.log(`   ✅ [Geocode] Nominatim thành công với: "${variant}"`);
          return { lat: Number(data[0].lat), lon: Number(data[0].lon) };
        }
      } catch (err) {
        console.warn(`   ⚠️  [Geocode] Nominatim lỗi:`, err);
      }
    }

    return null;
  }

  private stripVietnamesePrefix(part: string): string {
    return part
      .replace(/^(số nhà|số|nhà)\s+/i, "")
      .replace(/^(phường|xã|thị trấn|thôn|ấp|tổ|ngõ|ngách)\s+/i, "")
      .replace(/^(quận|huyện|thị xã|thành phố|tp\.?|tỉnh)\s+/i, "")
      .trim();
  }

  private buildAddressVariants(address: string): string[] {
    const raw = address
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const stripped = raw
      .map((part) => this.stripVietnamesePrefix(part))
      .filter(Boolean);
    const variants: string[] = [];

    for (let index = 0; index < stripped.length; index += 1) {
      variants.push(stripped.slice(index).join(", "));
    }

    variants.push(address);
    return [...new Set(variants)].filter(Boolean);
  }

  private haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const earthRadiusKm = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private async allocateFacility(
    session: ClientSession | undefined,
    shippingAddress: string,
    orderItems?: { productId: string; quantity: number }[],
  ) {
    const facilities = await Facility.find({ isActive: true }).session(
      session ?? null,
    );
    console.log(`\n${"─".repeat(60)}`);
    console.log(`🏪 [FACILITY ALLOCATION] Bắt đầu phân bổ đơn hàng`);
    console.log(`   📦 Địa chỉ giao: ${shippingAddress}`);
    console.log(`   🏬 Tổng cơ sở active: ${facilities.length}`);
    if (!facilities.length) {
      console.log(`   ❌ Không có cơ sở nào active!`);
      return null;
    }

    // Lọc facility còn đủ tồn kho (nếu có orderItems)
    let candidates = facilities;
    if (orderItems?.length) {
      const { Inventory } =
        await import("../../inventory/models/inventory.model");
      const available: typeof facilities = [];
      console.log(`   🔍 Kiểm tra tồn kho (${orderItems.length} sản phẩm):`);
      for (const facility of facilities) {
        let hasAll = true;
        const stockLines: string[] = [];
        for (const item of orderItems) {
          const inv = await Inventory.findOne({
            facility: facility._id,
            product: item.productId,
          }).session(session ?? null);
          const inStock = inv?.quantity ?? 0;
          const ok = inv && inv.quantity >= item.quantity;
          stockLines.push(
            `productId=${item.productId} cần=${item.quantity} tồn=${inStock} ${ok ? "✅" : "❌"}`,
          );
          if (!ok) {
            hasAll = false;
            break;
          }
        }
        const icon = hasAll ? "✅" : "❌";
        console.log(`     ${icon} [${facility.name}]`);
        stockLines.forEach((l) => console.log(`         └ ${l}`));
        if (hasAll) available.push(facility);
      }
      if (available.length > 0) {
        candidates = available;
        console.log(
          `   ✅ Cơ sở đủ hàng (${available.length}): ${available.map((f) => f.name).join(", ")}`,
        );
      } else {
        console.log(
          `   ⚠️  Không có cơ sở nào đủ hàng → dùng tất cả ${facilities.length} cơ sở`,
        );
      }
    }

    console.log(`   🌐 Geocoding địa chỉ bằng Nominatim...`);
    const customerCoords = await this.geocodeAddress(shippingAddress);

    if (customerCoords) {
      const withDistance = candidates
        .filter(
          (facility) => facility.latitude != null && facility.longitude != null,
        )
        .map((facility) => ({
          facility,
          distance: this.haversineDistance(
            customerCoords.lat,
            customerCoords.lon,
            facility.latitude!,
            facility.longitude!,
          ),
        }))
        .sort((a, b) => a.distance - b.distance);

      if (withDistance.length > 0) {
        const nearest = withDistance[0];
        console.log(
          `   🎯 KẾT QUẢ: Đơn hàng → "${nearest.facility.name}" (${nearest.distance.toFixed(2)} km)`,
        );
        console.log(`${"─".repeat(60)}\n`);
        return nearest.facility;
      }
    }

    console.log(
      `   🏠 Không lấy được tọa độ → chọn cơ sở đầu tiên đủ hàng: "${candidates[0].name}"`,
    );
    console.log(`${"─".repeat(60)}\n`);
    return candidates[0];
  }

  /**
   * Gửi email xác nhận nhưng không giữ request tạo đơn phải chờ SMTP.
   * sendConfirmationEmail đã tự nuốt lỗi bên trong, .catch ở đây chỉ để phòng xa.
   */
  private sendConfirmationEmailInBackground(
    order: OrderDocument,
    overrideEmail?: string,
  ): void {
    void this.sendConfirmationEmail(order, overrideEmail).catch((err) => {
      console.error("Failed to send order confirmation email:", err);
    });
  }

  private async sendConfirmationEmail(
    order: OrderDocument,
    overrideEmail?: string,
  ): Promise<void> {
    try {
      const email =
        overrideEmail ?? (order.customerIdOrder as AccountDocument)?.email;
      if (!email) return;
      const { MailService } = await import("@/utils/mail.service");
      const mailService = Container.get(MailService);
      await mailService.sendOrderConfirmationMail(email, order);
    } catch (err) {
      console.error("Failed to send order confirmation email:", err);
    }
  }
}

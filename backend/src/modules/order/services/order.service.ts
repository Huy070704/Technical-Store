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
import { Payment } from "../../payment/models/payment.model";
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

@Service()
export class OrderService {
  constructor(private readonly otpService: OtpService) {}

  // ─── Status transition guard ───────────────────────────────────────────────

  private validateStatusTransition(current: OrderStatus, next: OrderStatus): boolean {
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.ASSIGNED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
      [OrderStatus.PROCESSING]: [OrderStatus.SHIPPING, OrderStatus.CANCELLED, OrderStatus.SUCCESSFUL],
      [OrderStatus.SHIPPING]: [OrderStatus.DELIVERED, OrderStatus.DELIVERY_FAILED, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [OrderStatus.RETURNED],
      [OrderStatus.DELIVERY_FAILED]: [OrderStatus.SHIPPING, OrderStatus.CANCELLED],
      [OrderStatus.CANCELLED]: [],
      [OrderStatus.RETURNED]: [],
      [OrderStatus.SUCCESSFUL]: [],
    };
    return (allowed[current] ?? []).includes(next);
  }

  // ─── Customer: create order ────────────────────────────────────────────────

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
      const pricing = calcOrderPricing(subtotal, dto.shippingAddress);
      const now = new Date();

      const order = await this.persistOrder(session, {
        customer: account,
        dto,
        pricing,
        now,
        orderItems: lines.map((l) => ({
          productId: (l.product as ProductDocument).id,
          quantity: l.quantity,
        })),
      });

      await this.createOrderDetailsAndDeductStock(session, lines, order);
      await this.createInvoiceAndPayment(session, order, dto.paymentMethod, now, pricing.vatAmount);

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

    const otpResult = await this.otpService.checkVerifiedOtp(
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

      const pricing = calcOrderPricing(subtotal, dto.shippingAddress);
      const now = new Date();

      const order = await this.persistOrder(session, {
        customer: null,
        dto,
        pricing,
        now,
        orderItems: dto.guestCartItems!.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
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

      await this.createInvoiceAndPayment(session, order, dto.paymentMethod, now, pricing.vatAmount);
      return this.loadOrder(session, order._id.toString());
    });

    // Xóa OTP sau khi đặt hàng thành công để ngăn tái sử dụng trong TTL
    await this.otpService.invalidateOtp(dto.guestInfo.email, dto.guestOtp!);

    if (dto.paymentMethod !== PaymentMethodType.ONLINE && dto.guestInfo.email) {
      await this.sendConfirmationEmail(savedOrder, dto.guestInfo.email);
    }
    return savedOrder;
  }

  // ─── Staff: create in-store order ─────────────────────────────────────────

  async createInStoreOrder(dto: CreateInStoreOrderDto, staffId: string): Promise<OrderDocument> {
    if (!dto.items?.length) {
      throw new BadRequestException("Danh sách sản phẩm không được trống");
    }

    return runInTransaction(async (session) => {
      const staff = await Account.findById(staffId).session(session ?? null);
      if (!staff) throw new BadRequestException("Không tìm thấy thông tin nhân viên");

      const productIds = dto.items.map((i) => i.productId);
      const products = await Product.find({ _id: { $in: productIds } }).session(
        session ?? null
      );

      const facilityId = staff.facility ? (staff.facility as Types.ObjectId).toString() : null;

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
              `${product.name}: chỉ còn ${inv?.quantity ?? 0} sản phẩm tại kho`
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
            { session: session ?? undefined }
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
    if (order.orderType !== 2) throw new BadRequestException("Không phải đơn hàng tại quầy");
    if (order.status !== OrderStatus.PROCESSING) {
      throw new BadRequestException(`Đơn hàng không ở trạng thái chờ thanh toán (hiện tại: ${order.status})`);
    }
    if (order.paymentMethod !== "CASH") {
      throw new BadRequestException("Endpoint này chỉ dùng cho đơn tiền mặt");
    }

    const now = new Date();
    const invoiceNumber = `INV${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getTime()).slice(-6)}`;

    await runInTransaction(async (session) => {
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
      payment.status = "PAID";
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

    if (!order.guestEmail || order.guestEmail.trim().toLowerCase() !== email.trim().toLowerCase()) {
      throw new ForbiddenException("Email không khớp với đơn hàng");
    }

    return order;
  }

  // ─── Customer: read orders ────────────────────────────────────────────────

  async getOrdersByCustomer(
    accountId: string,
    page = 1,
    limit = 20,
    status?: string
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
    const [total, pending, assigned, processing, shipping, delivered, cancelled, returned] = await Promise.all([
      Order.countDocuments({ customerIdOrder: accountId }),
      Order.countDocuments({ customerIdOrder: accountId, status: OrderStatus.PENDING }),
      Order.countDocuments({ customerIdOrder: accountId, status: OrderStatus.ASSIGNED }),
      Order.countDocuments({ customerIdOrder: accountId, status: OrderStatus.PROCESSING }),
      Order.countDocuments({ customerIdOrder: accountId, status: OrderStatus.SHIPPING }),
      Order.countDocuments({ customerIdOrder: accountId, status: OrderStatus.DELIVERED }),
      Order.countDocuments({ customerIdOrder: accountId, status: OrderStatus.CANCELLED }),
      Order.countDocuments({ customerIdOrder: accountId, status: OrderStatus.RETURNED }),
    ]);

    return { total, pending, assigned, processing, shipping, delivered, cancelled, returned };
  }

  async getOrderById(orderId: string, accountId?: string): Promise<OrderDocument> {
    const order = await Order.findById(orderId).populate(ORDER_POPULATE as any);
    if (!order) {
      throw new EntityNotFoundException("Order");
    }
    if (accountId && (order.customerIdOrder as AccountDocument)?.id !== accountId) {
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
      { path: "customerIdOrder" },
      { path: "orderDetails", populate: { path: "product" } },
    ] as any);
    if (!order) {
      throw new EntityNotFoundException("Order");
    }
    if (accountId && (order.customerIdOrder as AccountDocument)?.id !== accountId) {
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
      if (dto.status === OrderStatus.CANCELLED) {
        toUpdate.cancelAt = new Date();
      } else if (dto.status === OrderStatus.PROCESSING) {
        toUpdate.confirmedAt = new Date();
      } else if (dto.status === OrderStatus.DELIVERED) {
        toUpdate.completedAt = new Date();
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

  // ─── Staff: read & manage orders ──────────────────────────────────────────

  async getOrders(
    page: number,
    limit: number,
    status?: string
  ): Promise<{ data: OrderDocument[]; total: number; page: number; limit: number }> {
    const filter: any = {};
    if (status) {
      const list = status.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length === 1) filter.status = list[0];
      else if (list.length > 1) filter.status = { $in: list };
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
    const order = await Order.findById(orderId);
    if (!order) throw new EntityNotFoundException("Order");

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Chỉ có thể xác nhận đơn hàng ở trạng thái PENDING. Trạng thái hiện tại: ${order.status}`
      );
    }

    order.status = OrderStatus.PROCESSING;
    order.confirmedAt = new Date();
    await order.save();

    return this.getOrderById(orderId);
  }

  async collectPayment(orderId: string, amount: number, method: string): Promise<OrderDocument> {
    const order = await Order.findById(orderId).populate("payments");
    if (!order) throw new EntityNotFoundException("Order");

    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException(
        "Chỉ có thể thu tiền khi đơn hàng đang ở trạng thái SHIPPING."
      );
    }

    const totalPaid = ((order.payments ?? []) as any[])
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Number(order.totalAmount) - totalPaid;

    if (amount <= 0 || amount > remaining + 0.01) {
      throw new BadRequestException(
        `Số tiền không hợp lệ. Số tiền còn phải thu: ${remaining.toLocaleString("vi-VN")} VND.`
      );
    }

    const payment = new Payment();
    payment.order = order._id;
    payment.amount = amount;
    payment.status = "PAID";
    payment.method = method;
    payment.paidAt = new Date();
    await payment.save();

    return this.getOrderById(orderId);
  }

  async staffConfirmDelivery(orderId: string): Promise<OrderDocument> {
    const order = await Order.findById(orderId).populate("payments");
    if (!order) throw new EntityNotFoundException("Order");

    if (order.status !== OrderStatus.SHIPPING) {
      throw new BadRequestException(
        "Chỉ có thể xác nhận giao khi đơn đang ở trạng thái SHIPPING."
      );
    }

    const totalPaid = ((order.payments ?? []) as any[])
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const isPaid = totalPaid >= Number(order.totalAmount) - 0.01;

    const now = new Date();
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

    order.status = OrderStatus.DELIVERED;
    order.completedAt = now;
    await order.save();

    return this.getOrderById(orderId);
  }

  async staffCancelOrder(orderId: string, cancelReason: string): Promise<OrderDocument> {
    const order = await Order.findById(orderId).populate([
      { path: "orderDetails", populate: { path: "product" } },
      { path: "invoices" },
    ] as any);
    if (!order) throw new EntityNotFoundException("Order");

    const cancellable = [
      OrderStatus.PENDING,
      OrderStatus.PROCESSING,
      OrderStatus.DELIVERY_FAILED,
    ];
    if (!cancellable.includes(order.status)) {
      throw new BadRequestException(
        `Không thể hủy đơn ở trạng thái ${order.status}`
      );
    }

    await runInTransaction(async (session) => {
      // Hoàn lại tồn kho (chỉ áp dụng cho đơn tại quầy có facility)
      if (order.orderType === 2 && order.facility) {
        const facilityId = (order.facility as Types.ObjectId).toString();
        for (const detail of order.orderDetails ?? []) {
          const productId = (detail.product as ProductDocument)._id;
          const inv = await Inventory.findOne({
            facility: facilityId,
            product: productId,
          }).session(session ?? null);
          if (inv) {
            inv.quantity += detail.quantity;
            await inv.save({ session: session ?? undefined });
          }
        }
      }

      // Refund invoice nếu đã thanh toán
      const invoice = (order.invoices ?? [])[0] as any;
      if (invoice && invoice.status === InvoiceStatus.PAID) {
        invoice.status = InvoiceStatus.REFUNDED;
        await invoice.save({ session: session ?? undefined });
      }

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
        `Chỉ có thể đánh dấu giao thất bại khi đơn đang ở trạng thái SHIPPING. Hiện tại: ${order.status}`
      );
    }

    order.status = OrderStatus.DELIVERY_FAILED;
    await order.save();
    return this.getOrderById(orderId);
  }

  async redeliverOrder(orderId: string): Promise<OrderDocument> {
    const order = await Order.findById(orderId);
    if (!order) throw new EntityNotFoundException("Order");

    if (order.status !== OrderStatus.DELIVERY_FAILED) {
      throw new BadRequestException(
        `Chỉ có thể giao lại khi đơn ở trạng thái DELIVERY_FAILED. Hiện tại: ${order.status}`
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
        `Chỉ có thể bàn giao shipper khi đơn ở trạng thái PROCESSING. Trạng thái hiện tại: ${order.status}`
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
      orderItems?: { productId: string; quantity: number }[];
    }
  ): Promise<OrderDocument> {
    const { customer, dto, pricing, now, orderItems } = opts;
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
      order.orderType = 2; // Guest order
      order.guestName = dto.guestInfo.fullName.trim();
      order.guestPhone = dto.guestInfo.phone.trim();
      order.guestAddress = dto.shippingAddress.trim();
      order.guestEmail = dto.guestInfo.email.trim().toLowerCase();
    } else {
      order.orderType = 1; // Member order
    }

    const allocatedFacility = await this.allocateFacility(
      session,
      dto.shippingAddress,
      orderItems
    );
    if (allocatedFacility) {
      order.facility = allocatedFacility._id;
    }

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
      detail.unitPrice = Number(product.price);
      await detail.save({ session: session ?? undefined });

    }
  }

  private async createInvoiceAndPayment(
    session: ClientSession | undefined,
    order: OrderDocument,
    paymentMethod: PaymentMethodType,
    now: Date,
    taxAmount: number
  ): Promise<void> {
    const invoiceNumber = `INV${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getTime()).slice(-6)}`;

    const invoice = new Invoice();
    invoice.order = order._id;
    invoice.invoiceNumber = invoiceNumber;
    invoice.totalAmount = order.totalAmount;
    invoice.paymentMethod = paymentMethod === PaymentMethodType.ONLINE ? "PAYOS" : "COD";
    invoice.status = InvoiceStatus.UNPAID;
    invoice.notes = `Hóa đơn cho đơn ${order.id}`;
    invoice.taxAmount = taxAmount;
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

  private async geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=vn`;
      const res = await fetch(url, {
        headers: { "User-Agent": "TechnicalStore/1.0 (contact@technical-store.com)" },
      });
      const data = await res.json() as any[];
      if (!data?.length) return null;
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    } catch {
      return null;
    }
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private async allocateFacility(
    session: ClientSession | undefined,
    shippingAddress: string,
    orderItems?: { productId: string; quantity: number }[]
  ) {
    const facilities = await Facility.find({ isActive: true }).session(session ?? null);
    if (!facilities.length) return null;

    // Geocode địa chỉ user → lat/lon
    const userCoords = await this.geocodeAddress(shippingAddress);

    // Lọc facility còn đủ tồn kho (nếu có orderItems)
    let candidates = facilities;
    if (orderItems?.length) {
      const { Inventory } = await import("../../inventory/models/inventory.model");
      const available: typeof facilities = [];
      for (const facility of facilities) {
        let hasAll = true;
        for (const item of orderItems) {
          const inv = await Inventory.findOne({
            facility: facility._id,
            product: item.productId,
          }).session(session ?? null);
          if (!inv || inv.quantity < item.quantity) {
            hasAll = false;
            break;
          }
        }
        if (hasAll) available.push(facility);
      }
      // Nếu có facility đủ hàng thì chỉ chọn trong số đó
      if (available.length > 0) candidates = available;
    }

    // Nếu geocode được → sort theo khoảng cách
    if (userCoords) {
      const withDistance = candidates
        .filter((f) => f.latitude != null && f.longitude != null)
        .map((f) => ({
          facility: f,
          distance: this.haversineDistance(userCoords.lat, userCoords.lon, f.latitude!, f.longitude!),
        }))
        .sort((a, b) => a.distance - b.distance);

      if (withDistance.length > 0) {
        console.log(`📍 Phân bổ đơn → ${withDistance[0].facility.name} (${withDistance[0].distance.toFixed(1)}km)`);
        return withDistance[0].facility;
      }
    }

    // Fallback: facility đầu tiên trong danh sách candidates
    return candidates[0];
  }

  private async sendConfirmationEmail(
    order: OrderDocument,
    overrideEmail?: string
  ): Promise<void> {
    try {
      const email = overrideEmail ?? (order.customerIdOrder as AccountDocument)?.email;
      if (!email) return;
      const { MailService } = await import("@/utils/mail.service");
      const mailService = Container.get(MailService);
      await mailService.sendOrderConfirmationMail(email, order);
    } catch (err) {
      console.error("Failed to send order confirmation email:", err);
    }
  }
}

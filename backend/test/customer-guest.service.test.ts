import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { Types } from "mongoose";
import { CartService } from "../src/modules/cart/services/cart.service";
import { Feedback } from "../src/modules/feedback/models/feedback.model";
import { FeedbackService } from "../src/modules/feedback/services/feedback.service";
import { OrderDetail } from "../src/modules/order/models/orderDetail.model";
import { Order, OrderStatus } from "../src/modules/order/models/order.model";
import { Payment } from "../src/modules/payment/models/payment.model";
import { Invoice } from "../src/modules/payment/models/invoice.model";
import { PaymentMethodType, createOrderSchema } from "../src/modules/order/schemas/order.schemas";
import { OrderService } from "../src/modules/order/services/order.service";
import { Product } from "../src/modules/product/models/product.model";
import { Wishlist } from "../src/modules/wishlist/models/wishlist.model";
import { WishlistService } from "../src/modules/wishlist/services/wishlist.service";
import {
  BadRequestException,
  ForbiddenException,
  ValidationException,
} from "../src/shared/exceptions/http-exceptions";

const transactionModule = require("../src/shared/mongoose/transaction") as {
  runInTransaction: <T>(fn: (session?: never) => Promise<T>) => Promise<T>;
};

const queryResult = <T>(value: T) => {
  const query: any = {
    populate() {
      return query;
    },
    select() {
      return query;
    },
    sort() {
      return query;
    },
    skip() {
      return query;
    },
    limit() {
      return query;
    },
    session() {
      return query;
    },
    then(resolve: (result: T) => unknown, reject: (error: unknown) => unknown) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
  return query;
};

describe("Guest - checkout validation", () => {
  it("schema bắt buộc guestInfo, OTP và guestCartItems", () => {
    const result = createOrderSchema.safeParse({
      shippingAddress: "85 Kim Mã, Ba Đình, Hà Nội",
      paymentMethod: PaymentMethodType.COD,
      isGuest: true,
    });

    assert.equal(result.success, false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      assert.ok(paths.includes("guestInfo"));
      assert.ok(paths.includes("guestOtp"));
      assert.ok(paths.includes("guestCartItems"));
    }
  });

  it("schema chuẩn hóa số điện thoại Việt Nam của guest", () => {
    const productId = new Types.ObjectId().toString();
    const result = createOrderSchema.parse({
      shippingAddress: "85 Kim Mã, Ba Đình, Hà Nội",
      paymentMethod: PaymentMethodType.ONLINE,
      isGuest: true,
      guestOtp: "123456",
      guestInfo: {
        fullName: "Nguyễn Văn A",
        phone: "0912 345 678",
        email: "guest@example.com",
      },
      guestCartItems: [{
        productId,
        quantity: 2,
        price: 1_000_000,
        name: "Laptop test",
      }],
    });

    assert.equal(result.guestInfo?.phone, "0912345678");
    assert.equal(result.guestCartItems?.[0].productId, productId);
  });

  it("service không tạo guest order nếu OTP chưa được xác minh", async () => {
    const otpMock = {
      async checkVerifiedOtp() { return "invalid" as const; },
      assertOtpVerified(result: string) {
        if (result !== "valid") {
          throw new ValidationException("OTP invalid", "OTP không hợp lệ");
        }
      },
    };
    const service = new OrderService(otpMock as never);

    await assert.rejects(
      () => service.createGuestOrder({
        shippingAddress: "85 Kim Mã, Ba Đình, Hà Nội",
        paymentMethod: PaymentMethodType.COD,
        isGuest: true,
        guestOtp: "000000",
        guestInfo: {
          fullName: "Nguyễn Văn A",
          phone: "0912345678",
          email: "guest@example.com",
        },
        guestCartItems: [{
          productId: new Types.ObjectId().toString(),
          quantity: 1,
          price: 100_000,
          name: "Chuột test",
        }],
        requireInvoice: false,
      }),
      (error: unknown) => error instanceof ValidationException,
    );
  });
});

describe("Guest - tra cứu đơn hàng", () => {
  const originalOrderFindById = Order.findById;

  afterEach(() => {
    Order.findById = originalOrderFindById;
  });

  it("trả đơn guest khi orderId và email khớp", async () => {
    const order = {
      id: new Types.ObjectId().toString(),
      customerIdOrder: null,
      guestEmail: "guest@example.com",
      status: OrderStatus.PENDING,
    };
    Order.findById = ((() => queryResult(order)) as unknown) as typeof Order.findById;
    const service = new OrderService({} as never);

    const result = await service.getGuestOrder(order.id, " GUEST@EXAMPLE.COM ");

    assert.equal(result, order as any);
  });

  it("không cho guest tra cứu đơn thành viên", async () => {
    const order = {
      id: new Types.ObjectId().toString(),
      customerIdOrder: new Types.ObjectId(),
      guestEmail: null,
    };
    Order.findById = ((() => queryResult(order)) as unknown) as typeof Order.findById;
    const service = new OrderService({} as never);

    await assert.rejects(
      () => service.getGuestOrder(order.id, "guest@example.com"),
      (error: unknown) => error instanceof ForbiddenException,
    );
  });

  it("không trả đơn khi email guest sai", async () => {
    const order = {
      id: new Types.ObjectId().toString(),
      customerIdOrder: null,
      guestEmail: "owner@example.com",
    };
    Order.findById = ((() => queryResult(order)) as unknown) as typeof Order.findById;
    const service = new OrderService({} as never);

    await assert.rejects(
      () => service.getGuestOrder(order.id, "other@example.com"),
      (error: unknown) => error instanceof ForbiddenException,
    );
  });
});

describe("Customer - lịch sử và ownership đơn hàng", () => {
  const originalOrderFind = Order.find;
  const originalOrderCount = Order.countDocuments;
  const originalOrderFindById = Order.findById;
  const originalRunInTransaction = transactionModule.runInTransaction;
  const originalPaymentFindOne = Payment.findOne;
  const originalPaymentUpdateMany = Payment.updateMany;
  const originalInvoiceUpdateMany = Invoice.updateMany;

  afterEach(() => {
    Order.find = originalOrderFind;
    Order.countDocuments = originalOrderCount;
    Order.findById = originalOrderFindById;
    transactionModule.runInTransaction = originalRunInTransaction;
    Payment.findOne = originalPaymentFindOne;
    Payment.updateMany = originalPaymentUpdateMany;
    Invoice.updateMany = originalInvoiceUpdateMany;
  });

  it("lịch sử luôn scope theo customerId và hỗ trợ status", async () => {
    const customerId = new Types.ObjectId().toString();
    const orders = [{ id: new Types.ObjectId().toString(), status: OrderStatus.PROCESSING }];
    let capturedFind: any;
    let capturedCount: any;
    Order.find = (((filter: any) => {
      capturedFind = filter;
      return queryResult(orders);
    }) as unknown) as typeof Order.find;
    Order.countDocuments = ((async (filter: any) => {
      capturedCount = filter;
      return 1;
    }) as unknown) as typeof Order.countDocuments;
    const service = new OrderService({} as never);

    const result = await service.getOrdersByCustomer(
      customerId,
      2,
      10,
      OrderStatus.PROCESSING,
    );

    assert.deepEqual(capturedFind, {
      customerIdOrder: customerId,
      status: OrderStatus.PROCESSING,
    });
    assert.deepEqual(capturedCount, capturedFind);
    assert.equal(result.orders, orders as any);
    assert.equal(result.total, 1);
  });

  it("customer xem được đơn của mình nhưng không xem được đơn người khác", async () => {
    const ownerId = new Types.ObjectId().toString();
    const order = {
      id: new Types.ObjectId().toString(),
      customerIdOrder: { id: ownerId },
    };
    Order.findById = ((() => queryResult(order)) as unknown) as typeof Order.findById;
    const service = new OrderService({} as never);

    assert.equal(await service.getOrderById(order.id, ownerId), order as any);
    await assert.rejects(
      () => service.getOrderById(order.id, new Types.ObjectId().toString()),
      (error: unknown) => error instanceof ForbiddenException,
    );
  });

  it("customer chỉ được hủy đơn PENDING của chính mình", async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId().toString();
    const initialOrder = {
      id: orderId,
      status: OrderStatus.PENDING,
      customerIdOrder: { id: customerId },
      orderDetails: [],
    };
    const updatedOrder = {
      ...initialOrder,
      cancelReason: null as string | null,
      cancelAt: null as Date | null,
      async save() { return this; },
    };
    let calls = 0;
    Order.findById = ((() => {
      calls += 1;
      return queryResult(calls === 1 ? initialOrder : updatedOrder);
    }) as unknown) as typeof Order.findById;
    // Đơn PENDING không có payment PayOS treo; huỷ chỉ dọn Payment/Invoice UNPAID.
    Payment.findOne = ((() => queryResult(null)) as unknown) as typeof Payment.findOne;
    let paymentUpdateManyCalled = false;
    let invoiceUpdateManyCalled = false;
    Payment.updateMany = ((async () => { paymentUpdateManyCalled = true; return {}; }) as unknown) as typeof Payment.updateMany;
    Invoice.updateMany = ((async () => { invoiceUpdateManyCalled = true; return {}; }) as unknown) as typeof Invoice.updateMany;
    transactionModule.runInTransaction = async (fn) => fn(undefined);
    const service = new OrderService({} as never);

    const result = await service.updateOrderStatus(orderId, customerId, {
      status: OrderStatus.CANCELLED,
      cancelReason: "Không còn nhu cầu mua sản phẩm",
    });

    assert.equal(result.status, OrderStatus.CANCELLED);
    assert.equal(updatedOrder.cancelReason, "Không còn nhu cầu mua sản phẩm");
    assert.ok(updatedOrder.cancelAt instanceof Date);
    // Huỷ đơn phải dọn Payment/Invoice để không còn treo "chưa thanh toán".
    assert.ok(paymentUpdateManyCalled);
    assert.ok(invoiceUpdateManyCalled);
  });

  it("customer không thể tự chuyển đơn sang PROCESSING", async () => {
    const customerId = new Types.ObjectId().toString();
    const order = {
      id: new Types.ObjectId().toString(),
      status: OrderStatus.PENDING,
      customerIdOrder: { id: customerId },
    };
    Order.findById = ((() => queryResult(order)) as unknown) as typeof Order.findById;
    const service = new OrderService({} as never);

    await assert.rejects(
      () => service.updateOrderStatus(order.id, customerId, {
        status: OrderStatus.PROCESSING,
      }),
      (error: unknown) => error instanceof ForbiddenException,
    );
  });

  it("customer không thể hủy khi đơn đã PROCESSING", async () => {
    const customerId = new Types.ObjectId().toString();
    const order = {
      id: new Types.ObjectId().toString(),
      status: OrderStatus.PROCESSING,
      customerIdOrder: { id: customerId },
    };
    Order.findById = ((() => queryResult(order)) as unknown) as typeof Order.findById;
    const service = new OrderService({} as never);

    await assert.rejects(
      () => service.updateOrderStatus(order.id, customerId, {
        status: OrderStatus.CANCELLED,
        cancelReason: "Muốn hủy đơn sau khi xử lý",
      }),
      (error: unknown) => error instanceof BadRequestException,
    );
  });
});

describe("Customer - feedback sau mua hàng", () => {
  const originalOrderFindById = Order.findById;
  const originalDetailFindOne = OrderDetail.findOne;
  const originalFeedbackFindOne = Feedback.findOne;
  const originalFeedbackCreate = Feedback.create;
  const originalFeedbackFindById = Feedback.findById;

  afterEach(() => {
    Order.findById = originalOrderFindById;
    OrderDetail.findOne = originalDetailFindOne;
    Feedback.findOne = originalFeedbackFindOne;
    Feedback.create = originalFeedbackCreate;
    Feedback.findById = originalFeedbackFindById;
  });

  it("cho phép đánh giá sản phẩm thuộc đơn DELIVERED của customer", async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId().toString();
    const productId = new Types.ObjectId().toString();
    const createdId = new Types.ObjectId();
    const hydrated = { id: createdId.toString(), rating: 5, customerContent: "Sản phẩm tốt" };
    Order.findById = ((async () => ({
      _id: new Types.ObjectId(orderId),
      customerIdOrder: new Types.ObjectId(customerId),
      status: OrderStatus.DELIVERED,
    })) as unknown) as typeof Order.findById;
    OrderDetail.findOne = ((async () => ({ _id: new Types.ObjectId() })) as unknown) as typeof OrderDetail.findOne;
    Feedback.findOne = ((async () => null) as unknown) as typeof Feedback.findOne;
    Feedback.create = ((async () => ({ _id: createdId })) as unknown) as typeof Feedback.create;
    Feedback.findById = ((() => queryResult(hydrated)) as unknown) as typeof Feedback.findById;
    const service = new FeedbackService({} as never);

    const result = await service.createFeedback(customerId, {
      orderId,
      productId,
      rating: 5,
      customerContent: "Sản phẩm tốt",
    });

    assert.equal(result, hydrated as any);
  });

  it("từ chối đánh giá đơn của customer khác", async () => {
    Order.findById = ((async () => ({
      customerIdOrder: new Types.ObjectId(),
      status: OrderStatus.DELIVERED,
    })) as unknown) as typeof Order.findById;
    const service = new FeedbackService({} as never);

    await assert.rejects(
      () => service.createFeedback(new Types.ObjectId().toString(), {
        orderId: new Types.ObjectId().toString(),
        productId: new Types.ObjectId().toString(),
        rating: 4,
        customerContent: "Test",
      }),
      (error: unknown) => error instanceof ForbiddenException,
    );
  });

  it("từ chối đánh giá trùng sản phẩm trong cùng đơn", async () => {
    const customerId = new Types.ObjectId().toString();
    Order.findById = ((async () => ({
      _id: new Types.ObjectId(),
      customerIdOrder: new Types.ObjectId(customerId),
      status: OrderStatus.SUCCESSFUL,
    })) as unknown) as typeof Order.findById;
    OrderDetail.findOne = ((async () => ({ _id: new Types.ObjectId() })) as unknown) as typeof OrderDetail.findOne;
    Feedback.findOne = ((async () => ({ _id: new Types.ObjectId() })) as unknown) as typeof Feedback.findOne;
    const service = new FeedbackService({} as never);

    await assert.rejects(
      () => service.createFeedback(customerId, {
        orderId: new Types.ObjectId().toString(),
        productId: new Types.ObjectId().toString(),
        rating: 5,
        customerContent: "Đánh giá lần hai",
      }),
      (error: unknown) => error instanceof BadRequestException,
    );
  });
});

describe("Customer/Guest - merge giỏ và wishlist sau đăng nhập", () => {
  const originalWishlistFindOne = Wishlist.findOne;
  const originalWishlistCreate = Wishlist.create;
  const originalWishlistDeleteOne = Wishlist.deleteOne;
  const originalProductFindById = Product.findById;

  afterEach(() => {
    Wishlist.findOne = originalWishlistFindOne;
    Wishlist.create = originalWishlistCreate;
    Wishlist.deleteOne = originalWishlistDeleteOne;
    Product.findById = originalProductFindById;
  });

  it("merge guest cart theo best-effort: bỏ dòng sai nhưng giữ dòng hợp lệ", async () => {
    const service = new CartService({} as never);
    const added: string[] = [];
    (service as any).addToCart = async (_accountId: string, line: any) => {
      if (line.productId === "bad-product") throw new Error("out of stock");
      added.push(line.productId);
    };
    (service as any).viewCart = async () => ({ cartItems: added, totalAmount: 100 });

    const result = await service.mergeGuestLines("customer-1", [
      { productId: "valid-product", quantity: 2 },
      { productId: "bad-product", quantity: 1 },
      { productId: "invalid-quantity", quantity: 0 },
    ]);

    assert.deepEqual(added, ["valid-product"]);
    assert.deepEqual(result, { cartItems: ["valid-product"], totalAmount: 100 });
  });

  it("wishlist toggle thêm sản phẩm tồn tại cho customer", async () => {
    const productId = new Types.ObjectId().toString();
    Wishlist.findOne = ((async () => null) as unknown) as typeof Wishlist.findOne;
    Product.findById = ((async () => ({ _id: new Types.ObjectId(productId) })) as unknown) as typeof Product.findById;
    let created: any;
    Wishlist.create = ((async (input: any) => {
      created = input;
      return input;
    }) as unknown) as typeof Wishlist.create;
    const service = new WishlistService();
    (service as any).getProductIds = async () => [productId];

    const result = await service.toggle("customer-1", productId);

    assert.equal(result.added, true);
    assert.deepEqual(result.productIds, [productId]);
    assert.deepEqual(created, { account: "customer-1", product: productId });
  });

  it("wishlist toggle xóa sản phẩm đã tồn tại", async () => {
    const productId = new Types.ObjectId().toString();
    const existingId = new Types.ObjectId();
    Wishlist.findOne = ((async () => ({ _id: existingId })) as unknown) as typeof Wishlist.findOne;
    let deletedFilter: any;
    Wishlist.deleteOne = ((async (filter: any) => {
      deletedFilter = filter;
      return { deletedCount: 1 };
    }) as unknown) as typeof Wishlist.deleteOne;
    const service = new WishlistService();
    (service as any).getProductIds = async () => [];

    const result = await service.toggle("customer-1", productId);

    assert.equal(result.added, false);
    assert.deepEqual(result.productIds, []);
    assert.deepEqual(deletedFilter, { _id: existingId });
  });
});

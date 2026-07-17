import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { Types } from "mongoose";
import { BadRequestException } from "../../../shared/exceptions/http-exceptions";
import { Facility } from "../../facility/models/facility.model";
import { Inventory } from "../../inventory/models/inventory.model";
import {
  Invoice,
  InvoiceDocument,
  InvoiceStatus,
} from "../../payment/models/invoice.model";
import {
  Payment,
  PaymentDocument,
  PaymentStatus,
} from "../../payment/models/payment.model";
import { Order, OrderStatus } from "../models/order.model";
import { PaymentMethodType } from "../schemas/order.schemas";
import {
  calcOrderPricing,
  detectShippingZone,
} from "../utils/order-pricing.util";
import { OrderService } from "./order.service";

const transactionModule = require("../../../shared/mongoose/transaction") as {
  runInTransaction: <T>(fn: (session?: never) => Promise<T>) => Promise<T>;
};

describe("OrderService - thanh toan don online", () => {
  const originalInvoiceSave = Invoice.prototype.save;
  const originalPaymentSave = Payment.prototype.save;
  let savedInvoices: InvoiceDocument[];
  let savedPayments: PaymentDocument[];

  beforeEach(() => {
    savedInvoices = [];
    savedPayments = [];

    Invoice.prototype.save = async function (this: InvoiceDocument) {
      savedInvoices.push(this);
      return this;
    } as typeof Invoice.prototype.save;

    Payment.prototype.save = async function (this: PaymentDocument) {
      savedPayments.push(this);
      return this;
    } as typeof Payment.prototype.save;
  });

  afterEach(() => {
    Invoice.prototype.save = originalInvoiceSave;
    Payment.prototype.save = originalPaymentSave;
  });

  const createInvoiceAndPayment = async (paymentMethod: PaymentMethodType) => {
    const service = new OrderService({} as never);
    const orderId = new Types.ObjectId();
    const order = {
      _id: orderId,
      id: orderId.toString(),
      totalAmount: 7_719_000,
    };

    await (service as any).createInvoiceAndPayment(
      undefined,
      order,
      paymentMethod,
      new Date("2026-07-13T00:00:00.000Z"),
      701_727,
    );

    return { orderId };
  };

  describe("PayOS", () => {
    // Trường hợp PayOS: tạo invoice chưa thanh toán và payment chờ PayOS xác nhận.
    it("tao invoice chua thanh toan va payment dang cho PayOS xac nhan", async () => {
      const { orderId } = await createInvoiceAndPayment(PaymentMethodType.ONLINE);

      assert.equal(savedInvoices.length, 1);
      assert.equal(savedInvoices[0].order.toString(), orderId.toString());
      assert.equal(savedInvoices[0].totalAmount, 7_719_000);
      assert.equal(savedInvoices[0].taxAmount, 701_727);
      assert.equal(savedInvoices[0].paymentMethod, "PAYOS");
      assert.equal(savedInvoices[0].status, InvoiceStatus.UNPAID);

      assert.equal(savedPayments.length, 1);
      assert.equal(savedPayments[0].order.toString(), orderId.toString());
      assert.equal(savedPayments[0].amount, 7_719_000);
      assert.equal(savedPayments[0].method, "PAYOS");
      assert.equal(savedPayments[0].status, PaymentStatus.PENDING);
    });
  });

  describe("COD", () => {
    // Trường hợp COD: tạo sẵn invoice và payment chờ thu khi giao hàng.
    it("tao invoice chua thanh toan va payment cho thu khi giao", async () => {
      const { orderId } = await createInvoiceAndPayment(PaymentMethodType.COD);

      assert.equal(savedInvoices.length, 1);
      assert.equal(savedInvoices[0].order.toString(), orderId.toString());
      assert.equal(savedInvoices[0].totalAmount, 7_719_000);
      assert.equal(savedInvoices[0].paymentMethod, "COD");
      assert.equal(savedInvoices[0].status, InvoiceStatus.UNPAID);
      assert.equal(savedPayments.length, 1);
      assert.equal(savedPayments[0].order.toString(), orderId.toString());
      assert.equal(savedPayments[0].amount, 7_719_000);
      assert.equal(savedPayments[0].method, "COD");
      assert.equal(savedPayments[0].status, PaymentStatus.PENDING);
    });
  });
});

describe("OrderService - giao lai don PayOS khong refund", () => {
  const originalFindOrderById = Order.findById;
  const originalPaymentFindOne = Payment.findOne;
  const originalPaymentUpdateMany = Payment.updateMany;
  const originalInvoiceUpdateMany = Invoice.updateMany;
  const originalRunInTransaction = transactionModule.runInTransaction;

  afterEach(() => {
    Order.findById = originalFindOrderById;
    Payment.findOne = originalPaymentFindOne;
    Payment.updateMany = originalPaymentUpdateMany;
    Invoice.updateMany = originalInvoiceUpdateMany;
    transactionModule.runInTransaction = originalRunInTransaction;
  });

  it("huy invoice va payment dang cho khi huy don PENDING", async () => {
    const orderId = new Types.ObjectId();
    const initialOrder = {
      _id: orderId,
      status: OrderStatus.PENDING,
      paymentMethod: "PAYOS",
      orderDetails: [],
    };
    const updatedOrder = {
      status: OrderStatus.PENDING,
      cancelReason: "",
      cancelAt: null as Date | null,
      async save() {
        return this;
      },
    };
    let orderLookupCount = 0;
    Order.findById = ((() => {
      orderLookupCount += 1;
      return orderLookupCount === 1
        ? { populate: async () => initialOrder }
        : { session: async () => updatedOrder };
    }) as unknown) as typeof Order.findById;
    Payment.findOne = ((() => ({
      session: async () => null,
    })) as unknown) as typeof Payment.findOne;
    let paymentStatus: string | undefined;
    let invoiceStatus: string | undefined;
    Payment.updateMany = ((async (_filter: unknown, update: any) => {
      paymentStatus = update.$set.status;
      return { modifiedCount: 1 };
    }) as unknown) as typeof Payment.updateMany;
    Invoice.updateMany = ((async (_filter: unknown, update: any) => {
      invoiceStatus = update.$set.status;
      return { modifiedCount: 1 };
    }) as unknown) as typeof Invoice.updateMany;
    transactionModule.runInTransaction = async (fn) => fn(undefined);
    const service = new OrderService({} as never);
    (service as any).getOrderById = async () => updatedOrder;

    const result = await service.staffCancelOrder(orderId.toString(), "Khach huy don");

    assert.equal(paymentStatus, PaymentStatus.CANCELLED);
    assert.equal(invoiceStatus, InvoiceStatus.CANCELLED);
    assert.equal(result.status, OrderStatus.CANCELLED);
  });

  // Đơn PayOS đã thanh toán vẫn hủy được: Payment/Invoice chuyển CANCELLED
  // (hoàn tiền cho khách xử lý thủ công), Order chuyển CANCELLED.
  for (const status of [OrderStatus.PROCESSING, OrderStatus.DELIVERY_FAILED]) {
    it(`huy don PayOS da thanh toan o trang thai ${status} va huy payment/invoice`, async () => {
      const orderId = new Types.ObjectId();
      const initialOrder = {
        _id: orderId,
        status,
        paymentMethod: "PAYOS",
        facility: new Types.ObjectId(),
        orderDetails: [],
      };
      const updatedOrder = {
        status,
        cancelReason: "",
        cancelAt: null as Date | null,
        async save() {
          return this;
        },
      };
      let orderLookupCount = 0;
      Order.findById = ((() => {
        orderLookupCount += 1;
        return orderLookupCount === 1
          ? { populate: async () => initialOrder }
          : { session: async () => updatedOrder };
      }) as unknown) as typeof Order.findById;
      Payment.findOne = ((() => ({
        session: async () => null,
      })) as unknown) as typeof Payment.findOne;
      let paymentStatus: string | undefined;
      let invoiceStatus: string | undefined;
      Payment.updateMany = ((async (_filter: unknown, update: any) => {
        paymentStatus = update.$set.status;
        return { modifiedCount: 1 };
      }) as unknown) as typeof Payment.updateMany;
      Invoice.updateMany = ((async (_filter: unknown, update: any) => {
        invoiceStatus = update.$set.status;
        return { modifiedCount: 1 };
      }) as unknown) as typeof Invoice.updateMany;
      transactionModule.runInTransaction = async (fn) => fn(undefined);
      const service = new OrderService({} as never);
      (service as any).getOrderById = async () => updatedOrder;

      const result = await service.staffCancelOrder(orderId.toString(), "Khong nhan hang");

      assert.equal(paymentStatus, PaymentStatus.CANCELLED);
      assert.equal(invoiceStatus, InvoiceStatus.CANCELLED);
      assert.equal(result.status, OrderStatus.CANCELLED);
    });
  }

  it("chuyen don PayOS tu DELIVERY_FAILED ve SHIPPING khi giao lai", async () => {
    const order = {
      status: OrderStatus.DELIVERY_FAILED,
      paymentMethod: "PAYOS",
      saveCalls: 0,
      async save() {
        this.saveCalls += 1;
        return this;
      },
    };
    Order.findById = ((async () => order) as unknown) as typeof Order.findById;
    const service = new OrderService({} as never);
    (service as any).getOrderById = async () => order;

    const result = await service.redeliverOrder(new Types.ObjectId().toString());

    assert.equal(result.status, OrderStatus.SHIPPING);
    assert.equal(order.saveCalls, 1);
  });

  it("giu don PayOS o DELIVERY_FAILED de cho giao lai", async () => {
    const order = {
      status: OrderStatus.SHIPPING,
      paymentMethod: "PAYOS",
      async save() {
        return this;
      },
    };
    Order.findById = ((async () => order) as unknown) as typeof Order.findById;
    const service = new OrderService({} as never);
    let cancelCalled = false;
    (service as any).staffCancelOrder = async () => {
      cancelCalled = true;
    };
    (service as any).getOrderById = async () => order;

    const result = await service.markDeliveryFailed(new Types.ObjectId().toString());

    assert.equal(result.status, OrderStatus.DELIVERY_FAILED);
    assert.equal(cancelCalled, false);
  });

  it("tu dong huy don COD khi giao that bai", async () => {
    const order = {
      status: OrderStatus.SHIPPING,
      paymentMethod: "COD",
      async save() {
        return this;
      },
    };
    const cancelledOrder = { status: OrderStatus.CANCELLED };
    Order.findById = ((async () => order) as unknown) as typeof Order.findById;
    const service = new OrderService({} as never);
    let receivedReason = "";
    (service as any).staffCancelOrder = async (_orderId: string, reason: string) => {
      receivedReason = reason;
      return cancelledOrder;
    };

    const result = await service.markDeliveryFailed(new Types.ObjectId().toString());

    assert.equal(result.status, OrderStatus.CANCELLED);
    assert.match(receivedReason, /COD/);
  });

  it("khong cho giao lai don COD", async () => {
    Order.findById = ((async () => ({
      status: OrderStatus.DELIVERY_FAILED,
      paymentMethod: "COD",
    })) as unknown) as typeof Order.findById;
    const service = new OrderService({} as never);

    await assert.rejects(
      () => service.redeliverOrder(new Types.ObjectId().toString()),
      (error: unknown) =>
        error instanceof BadRequestException && error.message.includes("PayOS"),
    );
  });
});

describe("OrderService.confirmOrder - xu ly don online", () => {
  const originalFindOrderById = Order.findById;
  const originalFindInventory = Inventory.findOne;
  const originalRunInTransaction = transactionModule.runInTransaction;

  afterEach(() => {
    Order.findById = originalFindOrderById;
    Inventory.findOne = originalFindInventory;
    transactionModule.runInTransaction = originalRunInTransaction;
  });

  const mockInitialOrder = (order: Record<string, unknown> | null) => {
    Order.findById = ((() => ({
      populate: async () => order,
    })) as unknown) as typeof Order.findById;
  };

  describe("Dùng chung", () => {
    // Trường hợp mã đơn không tồn tại: phải trả về lỗi không tìm thấy Order.
    it("bao loi khi khong tim thay don", async () => {
      mockInitialOrder(null);
      const service = new OrderService({} as never);

      await assert.rejects(() => service.confirmOrder(new Types.ObjectId().toString()), /Order/);
    });

    for (const status of [
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPING,
      OrderStatus.DELIVERED,
      OrderStatus.DELIVERY_FAILED,
      OrderStatus.CANCELLED,
      OrderStatus.SUCCESSFUL,
    ]) {
      // Trường hợp đơn không còn ở PENDING: từ chối xác nhận với từng trạng thái hiện tại.
      it(`bao loi khi trang thai hien tai la ${status}`, async () => {
        mockInitialOrder({ status, paymentMethod: "COD" });
        const service = new OrderService({} as never);

        await assert.rejects(
          () => service.confirmOrder(new Types.ObjectId().toString()),
          (error: unknown) =>
            error instanceof BadRequestException && error.message.includes("PENDING"),
        );
      });
    }
  });

  describe("PayOS", () => {
    // Trường hợp PayOS đang chờ webhook: staff không được xác nhận đơn thủ công.
    it("khong cho staff xac nhan thu cong khi dang cho webhook", async () => {
      mockInitialOrder({ status: OrderStatus.PENDING, paymentMethod: "ONLINE" });
      const service = new OrderService({} as never);

      await assert.rejects(
        () => service.confirmOrder(new Types.ObjectId().toString()),
        (error: unknown) =>
          error instanceof BadRequestException && error.message.toLowerCase().includes("online"),
      );
    });
  });

  describe("COD", () => {
    // Trường hợp COD thiếu tồn kho: báo lỗi và không thực hiện trừ kho.
    it("bao loi va khong tru kho khi ton kho khong du", async () => {
    const productId = new Types.ObjectId();
    const order = {
      status: OrderStatus.PENDING,
      paymentMethod: "COD",
      facility: new Types.ObjectId(),
      orderDetails: [{ product: { _id: productId, name: "Laptop test" }, quantity: 2 }],
    };
    mockInitialOrder(order);
    transactionModule.runInTransaction = async (fn) => fn(undefined);
    Inventory.findOne = ((() => ({
      session: async () => ({ quantity: 1 }),
    })) as unknown) as typeof Inventory.findOne;
    const service = new OrderService({} as never);

    await assert.rejects(
      () => service.confirmOrder(new Types.ObjectId().toString()),
      (error: unknown) =>
        error instanceof BadRequestException && error.message.includes("Laptop test"),
    );
    });

    // Trường hợp COD đủ tồn kho: trừ đúng số lượng và chuyển đơn sang PROCESSING.
    it("tru kho va chuyen don tu PENDING sang PROCESSING", async () => {
    const orderId = new Types.ObjectId().toString();
    const productId = new Types.ObjectId();
    const inventory = {
      quantity: 5,
      saveCalls: 0,
      async save() {
        this.saveCalls += 1;
        return this;
      },
    };
    const initialOrder = {
      status: OrderStatus.PENDING,
      paymentMethod: "COD",
      facility: new Types.ObjectId(),
      orderDetails: [{ product: { _id: productId, name: "Laptop test" }, quantity: 2 }],
    };
    const updatedOrder = {
      status: OrderStatus.PENDING,
      confirmedAt: null as Date | null,
      saveCalls: 0,
      async save() {
        this.saveCalls += 1;
        return this;
      },
    };
    let findOrderCalls = 0;
    Order.findById = ((() => {
      findOrderCalls += 1;
      if (findOrderCalls === 1) {
        return { populate: async () => initialOrder };
      }
      return { session: async () => updatedOrder };
    }) as unknown) as typeof Order.findById;
    Inventory.findOne = ((() => ({
      session: async () => inventory,
    })) as unknown) as typeof Inventory.findOne;
    transactionModule.runInTransaction = async (fn) => fn(undefined);

    const service = new OrderService({} as never);
    (service as any).getOrderById = async () => updatedOrder;

    const result = await service.confirmOrder(orderId);

    assert.equal(inventory.quantity, 3);
    assert.equal(inventory.saveCalls, 1);
    assert.equal(updatedOrder.status, OrderStatus.PROCESSING);
    assert.ok(updatedOrder.confirmedAt instanceof Date);
    assert.equal(updatedOrder.saveCalls, 1);
    assert.equal(result, updatedOrder);
    });
  });
});

describe("OrderService.getOrders - trang quan ly don online", () => {
  const originalCountDocuments = Order.countDocuments;
  const originalFindOrder = Order.find;
  let capturedCountFilter: Record<string, any>;
  let capturedFindFilter: Record<string, any>;
  let capturedSort: Record<string, number>;
  let capturedSkip: number;
  let capturedLimit: number;
  const returnedOrders = [{ _id: new Types.ObjectId(), status: OrderStatus.PENDING }];

  beforeEach(() => {
    capturedCountFilter = {};
    capturedFindFilter = {};
    capturedSort = {};
    capturedSkip = -1;
    capturedLimit = -1;

    Order.countDocuments = (async (filter: Record<string, any>) => {
      capturedCountFilter = filter;
      return 21;
    }) as typeof Order.countDocuments;

    Order.find = (((filter: Record<string, any>) => {
      capturedFindFilter = filter;
      const query = {
        populate() {
          return this;
        },
        sort(value: Record<string, number>) {
          capturedSort = value;
          return this;
        },
        skip(value: number) {
          capturedSkip = value;
          return this;
        },
        async limit(value: number) {
          capturedLimit = value;
          return returnedOrders;
        },
      };
      return query;
    }) as unknown) as typeof Order.find;
  });

  afterEach(() => {
    Order.countDocuments = originalCountDocuments;
    Order.find = originalFindOrder;
  });

  // Trường hợp mở trang online: chỉ truy vấn orderType=1 và trả đúng metadata phân trang.
  it("chi lay don online voi orderType bang 1", async () => {
    const service = new OrderService({} as never);

    const result = await service.getOrders(1, 10, undefined, undefined, 1);

    assert.deepEqual(capturedCountFilter, { orderType: 1 });
    assert.deepEqual(capturedFindFilter, { orderType: 1 });
    assert.equal(result.data, returnedOrders);
    assert.equal(result.total, 21);
    assert.equal(result.page, 1);
    assert.equal(result.limit, 10);
  });

  // Trường hợp chọn một chip trạng thái: lọc đúng trạng thái đang chọn.
  it("loc mot trang thai tu chip tren trang", async () => {
    const service = new OrderService({} as never);

    await service.getOrders(1, 10, OrderStatus.PROCESSING, undefined, 1);

    assert.equal(capturedFindFilter.status, OrderStatus.PROCESSING);
    assert.equal(capturedFindFilter.orderType, 1);
  });

  // Trường hợp backend nhận nhiều trạng thái: chuyển danh sách thành điều kiện $in.
  it("loc nhieu trang thai cua don online", async () => {
    const service = new OrderService({} as never);

    await service.getOrders(
      1,
      10,
      `${OrderStatus.PENDING}, ${OrderStatus.PROCESSING},${OrderStatus.SHIPPING}`,
      undefined,
      1,
    );

    assert.deepEqual(capturedFindFilter.status, {
      $in: [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.SHIPPING],
    });
  });

  // Trường hợp staff thuộc một cơ sở: chỉ hiển thị đơn online của facility đó.
  it("loc don online theo facility cua staff", async () => {
    const service = new OrderService({} as never);
    const facilityId = new Types.ObjectId().toString();

    await service.getOrders(1, 10, undefined, facilityId, 1);

    assert.equal(capturedFindFilter.facility, facilityId);
    assert.equal(capturedFindFilter.orderType, 1);
  });

  // Trường hợp lọc khoảng ngày: ngày bắt đầu từ 00:00:00.000 và kết thúc lúc 23:59:59.999.
  it("loc don theo tron khoang ngay duoc chon", async () => {
    const service = new OrderService({} as never);

    await service.getOrders(1, 10, undefined, undefined, 1, "2026-07-01", "2026-07-13");

    const range = capturedFindFilter.orderAt;
    assert.ok(range.$gte instanceof Date);
    assert.ok(range.$lte instanceof Date);
    assert.equal(range.$gte.getHours(), 0);
    assert.equal(range.$gte.getMinutes(), 0);
    assert.equal(range.$gte.getSeconds(), 0);
    assert.equal(range.$gte.getMilliseconds(), 0);
    assert.equal(range.$lte.getHours(), 23);
    assert.equal(range.$lte.getMinutes(), 59);
    assert.equal(range.$lte.getSeconds(), 59);
    assert.equal(range.$lte.getMilliseconds(), 999);
  });

  // Trường hợp chuyển trang: sắp xếp đơn mới nhất và tính skip theo page/limit.
  it("sap xep moi nhat va phan trang dung", async () => {
    const service = new OrderService({} as never);

    await service.getOrders(3, 10, undefined, undefined, 1);

    assert.deepEqual(capturedSort, { orderAt: -1 });
    assert.equal(capturedSkip, 20);
    assert.equal(capturedLimit, 10);
  });

  // Trường hợp kết hợp bộ lọc: giữ đồng thời orderType, status, facility và khoảng ngày.
  it("ket hop cac bo loc tren trang quan ly don online", async () => {
    const service = new OrderService({} as never);
    const facilityId = new Types.ObjectId().toString();

    await service.getOrders(
      2,
      10,
      OrderStatus.DELIVERED,
      facilityId,
      1,
      "2026-07-01",
      "2026-07-13",
    );

    assert.equal(capturedFindFilter.orderType, 1);
    assert.equal(capturedFindFilter.status, OrderStatus.DELIVERED);
    assert.equal(capturedFindFilter.facility, facilityId);
    assert.ok(capturedFindFilter.orderAt.$gte instanceof Date);
    assert.ok(capturedFindFilter.orderAt.$lte instanceof Date);
    assert.equal(capturedSkip, 10);
  });
});

describe("OrderService - dia chi giao hang va phan bo facility", () => {
  const originalFindFacility = Facility.find;
  const originalFindInventory = Inventory.findOne;

  afterEach(() => {
    Facility.find = originalFindFacility;
    Inventory.findOne = originalFindInventory;
  });

  const mockFacilities = (facilities: Array<Record<string, unknown>>) => {
    Facility.find = ((() => ({
      session: async () => facilities,
    })) as unknown) as typeof Facility.find;
  };

  // Trường hợp địa chỉ thuộc quận nội thành Hà Nội: áp dụng phí giao hàng 30.000đ.
  it("nhan dien dia chi noi thanh Ha Noi", () => {
    const address = "Số 1 Tràng Tiền, Quận Hoàn Kiếm, Hà Nội";

    assert.equal(detectShippingZone(address), "inner_hanoi");
    assert.deepEqual(calcOrderPricing(1_000_000, address), {
      subtotalAmount: 1_000_000,
      shippingFee: 30_000,
      vatAmount: 100_000,
      totalAmount: 1_130_000,
      shippingZone: "inner_hanoi",
    });
  });

  // Trường hợp địa chỉ thuộc huyện ngoại thành Hà Nội: áp dụng phí giao hàng 50.000đ.
  it("nhan dien dia chi ngoai thanh Ha Noi", () => {
    const address = "Xã Dục Tú, Huyện Đông Anh, Thành phố Hà Nội";

    assert.equal(detectShippingZone(address), "outer_hanoi");
    assert.equal(calcOrderPricing(1_000_000, address).shippingFee, 50_000);
  });

  // Trường hợp địa chỉ ngoài Hà Nội: áp dụng phí giao hàng tỉnh 100.000đ.
  it("nhan dien dia chi tinh khac", () => {
    const address = "Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh";

    assert.equal(detectShippingZone(address), "other_province");
    assert.equal(calcOrderPricing(1_000_000, address).shippingFee, 100_000);
  });

  // Trường hợp chuỗi chỉ ghi Hà Nội nhưng thiếu quận/huyện: mặc định là nội thành.
  it("mac dinh noi thanh khi dia chi Ha Noi khong co quan huyen", () => {
    assert.equal(detectShippingZone("Hà Nội, Việt Nam"), "inner_hanoi");
  });

  // Trường hợp đơn đạt ngưỡng miễn phí ship: phí ship bằng 0 ở mọi khu vực.
  it("mien phi ship khi gia tri hang dat 5 trieu", () => {
    const pricing = calcOrderPricing(
      5_000_000,
      "Phường Bến Nghé, Quận 1, Thành phố Hồ Chí Minh",
    );

    assert.equal(pricing.shippingZone, "other_province");
    assert.equal(pricing.shippingFee, 0);
    assert.equal(pricing.vatAmount, 500_000);
    assert.equal(pricing.totalAmount, 5_500_000);
  });

  it("tao cac bien the dia chi cho Nominatim", () => {
    const service = new OrderService({} as never);
    const variants = (service as any).buildAddressVariants(
      "Số nhà 85 Kim Mã, Phường Kim Mã, Quận Ba Đình, Thành phố Hà Nội",
    ) as string[];

    assert.equal(variants[0], "85 Kim Mã, Kim Mã, Ba Đình, Hà Nội");
    assert.ok(variants.includes("Kim Mã, Ba Đình, Hà Nội"));
    assert.ok(variants.includes("Ba Đình, Hà Nội"));
    assert.ok(variants.includes("Hà Nội"));
    assert.equal(new Set(variants).size, variants.length);
  });

  it("tinh khoang cach bang cong thuc Haversine", () => {
    const service = new OrderService({} as never);
    const distance = (service as any).haversineDistance(
      21.028511,
      105.804817,
      21.028511,
      105.804817,
    );

    assert.equal(distance, 0);
  });

  // Trường hợp không có facility đang hoạt động: không thể phân bổ đơn.
  it("tra ve null khi khong co facility active", async () => {
    mockFacilities([]);
    const service = new OrderService({} as never);
    let geocodeCalled = false;
    (service as any).geocodeAddress = async () => {
      geocodeCalled = true;
      return { lat: 21, lon: 105 };
    };

    const result = await (service as any).allocateFacility(
      undefined,
      "Quận Cầu Giấy, Hà Nội",
    );

    assert.equal(result, null);
    assert.equal(geocodeCalled, false);
  });

  // Trường hợp nhiều facility đều đủ hàng: chọn cơ sở gần địa chỉ khách nhất.
  it("chon facility du hang gan nhat", async () => {
    const farId = new Types.ObjectId();
    const nearId = new Types.ObjectId();
    const facilities = [
      { _id: farId, name: "Cơ sở xa", latitude: 21.15, longitude: 105.8 },
      { _id: nearId, name: "Cơ sở gần", latitude: 21.03, longitude: 105.81 },
    ];
    mockFacilities(facilities);
    Inventory.findOne = ((() => ({
      session: async () => ({ quantity: 10 }),
    })) as unknown) as typeof Inventory.findOne;
    const service = new OrderService({} as never);
    (service as any).geocodeAddress = async () => ({ lat: 21.028, lon: 105.805 });

    const result = await (service as any).allocateFacility(
      undefined,
      "Quận Cầu Giấy, Hà Nội",
      [{ productId: new Types.ObjectId().toString(), quantity: 2 }],
    );

    assert.equal(result._id.toString(), nearId.toString());
  });

  // Cơ sở gần nhưng thiếu hàng phải bị bỏ qua.
  it("uu tien facility du hang", async () => {
    const nearId = new Types.ObjectId();
    const stockedId = new Types.ObjectId();
    const facilities = [
      { _id: nearId, name: "Cơ sở gần nhưng thiếu hàng", latitude: 21.03, longitude: 105.81 },
      { _id: stockedId, name: "Cơ sở xa nhưng đủ hàng", latitude: 21.15, longitude: 105.8 },
    ];
    mockFacilities(facilities);
    Inventory.findOne = (((filter: { facility: Types.ObjectId }) => ({
      session: async () => ({
        quantity: filter.facility.toString() === nearId.toString() ? 1 : 10,
      }),
    })) as unknown) as typeof Inventory.findOne;
    const service = new OrderService({} as never);
    (service as any).geocodeAddress = async () => ({ lat: 21.028, lon: 105.805 });

    const result = await (service as any).allocateFacility(
      undefined,
      "Quận Cầu Giấy, Hà Nội",
      [{ productId: new Types.ObjectId().toString(), quantity: 2 }],
    );

    assert.equal(result._id.toString(), stockedId.toString());
  });

  it("fallback facility dau tien khi Nominatim khong tim thay dia chi", async () => {
    const firstId = new Types.ObjectId();
    mockFacilities([
      { _id: firstId, name: "Cơ sở đầu", latitude: 21.1, longitude: 105.8 },
      { _id: new Types.ObjectId(), name: "Cơ sở sau", latitude: 21.02, longitude: 105.8 },
    ]);
    const service = new OrderService({} as never);
    (service as any).geocodeAddress = async () => null;

    const result = await (service as any).allocateFacility(
      undefined,
      "Địa chỉ không tìm thấy",
    );

    assert.equal(result._id.toString(), firstId.toString());
  });

  it("fallback facility dau tien khi co so chua co toa do", async () => {
    const firstId = new Types.ObjectId();
    mockFacilities([
      { _id: firstId, name: "Cơ sở chưa có tọa độ" },
      { _id: new Types.ObjectId(), name: "Cơ sở khác" },
    ]);
    const service = new OrderService({} as never);
    (service as any).geocodeAddress = async () => ({ lat: 21.028, lon: 105.805 });

    const result = await (service as any).allocateFacility(
      undefined,
      "Quận Cầu Giấy, Hà Nội",
    );

    assert.equal(result._id.toString(), firstId.toString());
  });
});

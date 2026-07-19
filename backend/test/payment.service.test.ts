import "reflect-metadata";
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { Types } from "mongoose";
import { Inventory } from "../src/modules/inventory/models/inventory.model";
import { Order, OrderStatus } from "../src/modules/order/models/order.model";
import { InvoiceStatus } from "../src/modules/payment/models/invoice.model";
import {
  normalizePaymentStatus,
  Payment,
  PaymentStatus,
} from "../src/modules/payment/models/payment.model";
import { PaymentService } from "../src/modules/payment/services/payment.service";
import {
  BadRequestException,
  ForbiddenException,
} from "../src/shared/exceptions/http-exceptions";
import { payos } from "../src/utils/payos";

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
    session() {
      return query;
    },
    then(resolve: (result: T) => unknown, reject: (error: unknown) => unknown) {
      return Promise.resolve(value).then(resolve, reject);
    },
  };
  return query;
};

describe("Payment - status normalization", () => {
  it("chuẩn hóa dữ liệu payment cũ về bộ trạng thái chuẩn", () => {
    assert.equal(normalizePaymentStatus("completed"), PaymentStatus.PAID);
    assert.equal(normalizePaymentStatus("SUCCESSFUL"), PaymentStatus.PAID);
    assert.equal(normalizePaymentStatus("canceled"), PaymentStatus.CANCELLED);
    assert.equal(normalizePaymentStatus("failure"), PaymentStatus.FAILED);
    assert.equal(normalizePaymentStatus("unknown"), PaymentStatus.PENDING);
  });
});

describe("PaymentService - quyền truy cập trạng thái thanh toán", () => {
  const originalOrderFindById = Order.findById;
  const originalPaymentFindOne = Payment.findOne;

  afterEach(() => {
    Order.findById = originalOrderFindById;
    Payment.findOne = originalPaymentFindOne;
  });

  const arrange = (customerId: string | null, guestEmail?: string) => {
    const orderId = new Types.ObjectId().toString();
    const order = {
      _id: new Types.ObjectId(orderId),
      id: orderId,
      orderType: 1,
      customerIdOrder: customerId ? { id: customerId } : null,
      guestEmail: guestEmail ?? null,
    };
    const payment = {
      id: new Types.ObjectId().toString(),
      order,
      amount: 1_250_000,
      status: PaymentStatus.PENDING,
      method: "PAYOS",
      createdAt: new Date("2026-07-19T00:00:00.000Z"),
      updatedAt: new Date("2026-07-19T00:00:00.000Z"),
    };
    Order.findById = ((() => queryResult(order)) as unknown) as typeof Order.findById;
    Payment.findOne = ((() => queryResult(payment)) as unknown) as typeof Payment.findOne;
    return { orderId, payment };
  };

  it("customer chỉ xem được payment của chính mình", async () => {
    const customerId = new Types.ObjectId().toString();
    const { orderId, payment } = arrange(customerId);
    const service = new PaymentService();

    const result = await service.getPaymentStatus(orderId, { accountId: customerId });

    assert.equal(result.orderId, orderId);
    assert.equal(result.transactionId, payment.id);
    assert.equal(result.status, PaymentStatus.PENDING);
    assert.equal(result.amount, 1_250_000);
  });

  it("từ chối account khác đọc payment của customer", async () => {
    const ownerId = new Types.ObjectId().toString();
    const { orderId } = arrange(ownerId);
    const service = new PaymentService();

    await assert.rejects(
      () => service.getPaymentStatus(orderId, { accountId: new Types.ObjectId().toString() }),
      (error: unknown) => error instanceof ForbiddenException,
    );
  });

  it("guest đọc payment khi email khớp, không phân biệt hoa thường", async () => {
    const { orderId } = arrange(null, "guest@example.com");
    const service = new PaymentService();

    const result = await service.getPaymentStatus(orderId, {
      guestEmail: " Guest@Example.COM ",
    });

    assert.equal(result.orderId, orderId);
    assert.equal(result.status, PaymentStatus.PENDING);
  });

  it("từ chối guest khi thiếu email hoặc email không khớp", async () => {
    const { orderId } = arrange(null, "guest@example.com");
    const service = new PaymentService();

    await assert.rejects(
      () => service.getPaymentStatus(orderId),
      (error: unknown) => error instanceof BadRequestException,
    );
    await assert.rejects(
      () => service.getPaymentStatus(orderId, { guestEmail: "other@example.com" }),
      (error: unknown) => error instanceof ForbiddenException,
    );
  });

  it("từ chối orderId không phải Mongo ObjectId", async () => {
    const service = new PaymentService();
    await assert.rejects(
      () => service.getPaymentStatus("invalid-order-id"),
      (error: unknown) => error instanceof BadRequestException,
    );
  });
});

describe("PaymentService - tạo link PayOS", () => {
  const originalOrderFindById = Order.findById;
  const originalPaymentFindOne = Payment.findOne;
  const originalPaymentFind = Payment.find;
  const originalPaymentSave = Payment.prototype.save;
  const originalCreateLink = payos.createPaymentLink;
  const originalCancelLink = payos.cancelPaymentLink;

  let createdPayments: any[];
  let createPayload: any;

  beforeEach(() => {
    createdPayments = [];
    createPayload = null;
    Payment.findOne = ((() => queryResult(null)) as unknown) as typeof Payment.findOne;
    Payment.find = ((() => queryResult([])) as unknown) as typeof Payment.find;
    Payment.prototype.save = (async function (this: any) {
      createdPayments.push(this);
      return this;
    }) as typeof Payment.prototype.save;
    payos.createPaymentLink = (async (payload: any) => {
      createPayload = payload;
      return { checkoutUrl: "https://payos.test/checkout" } as any;
    }) as typeof payos.createPaymentLink;
    payos.cancelPaymentLink = (async () => ({} as any)) as typeof payos.cancelPaymentLink;
  });

  afterEach(() => {
    Order.findById = originalOrderFindById;
    Payment.findOne = originalPaymentFindOne;
    Payment.find = originalPaymentFind;
    Payment.prototype.save = originalPaymentSave;
    payos.createPaymentLink = originalCreateLink;
    payos.cancelPaymentLink = originalCancelLink;
  });

  it("tạo link bằng tổng tiền phía server cho đúng customer", async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId().toString();
    const order = {
      _id: new Types.ObjectId(orderId),
      id: orderId,
      orderType: 1,
      paymentMethod: "ONLINE",
      totalAmount: 2_345_000,
      customerIdOrder: { id: customerId },
      payments: [],
    };
    Order.findById = ((() => queryResult(order)) as unknown) as typeof Order.findById;
    const service = new PaymentService();

    const url = await service.createPayosPaymentLink(orderId, { accountId: customerId });

    assert.equal(url, "https://payos.test/checkout");
    assert.equal(createdPayments.length, 1);
    assert.equal(createdPayments[0].amount, 2_345_000);
    assert.equal(createdPayments[0].method, "PAYOS");
    assert.equal(createdPayments[0].status, PaymentStatus.PENDING);
    assert.equal(createPayload.amount, 2_345_000);
    assert.match(createPayload.returnUrl, new RegExp(`orderId=${orderId}$`));
    assert.match(createPayload.cancelUrl, new RegExp(`orderId=${orderId}$`));
  });

  it("guest chỉ tạo link khi email trùng với đơn", async () => {
    const orderId = new Types.ObjectId().toString();
    const order = {
      _id: new Types.ObjectId(orderId),
      id: orderId,
      orderType: 1,
      paymentMethod: "ONLINE",
      totalAmount: 500_000,
      customerIdOrder: null,
      guestEmail: "guest@example.com",
      payments: [],
    };
    Order.findById = ((() => queryResult(order)) as unknown) as typeof Order.findById;
    const service = new PaymentService();

    await assert.rejects(
      () => service.createPayosPaymentLink(orderId, { guestEmail: "attacker@example.com" }),
      (error: unknown) => error instanceof ForbiddenException,
    );

    const url = await service.createPayosPaymentLink(orderId, {
      guestEmail: "GUEST@example.com",
    });
    assert.equal(url, "https://payos.test/checkout");
  });

  it("không tạo link mới nếu payment đã PAID", async () => {
    const customerId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId().toString();
    const order = {
      id: orderId,
      orderType: 1,
      paymentMethod: "ONLINE",
      totalAmount: 500_000,
      customerIdOrder: { id: customerId },
      payments: [{
        status: PaymentStatus.PAID,
        payosOrderCode: "123456",
        createdAt: new Date(),
      }],
    };
    Order.findById = ((() => queryResult(order)) as unknown) as typeof Order.findById;
    const service = new PaymentService();

    await assert.rejects(
      () => service.createPayosPaymentLink(orderId, { accountId: customerId }),
      (error: unknown) =>
        error instanceof BadRequestException && error.message.includes("thanh toán"),
    );
    assert.equal(createPayload, null);
  });
});

describe("PaymentService - đồng bộ PayOS", () => {
  const originalPaymentFindById = Payment.findById;
  const originalPaymentFind = Payment.find;
  const originalOrderFindById = Order.findById;
  const originalInventoryFindOne = Inventory.findOne;
  const originalGetInformation = payos.getPaymentLinkInformation;
  const originalCancelLink = payos.cancelPaymentLink;
  const originalRunInTransaction = transactionModule.runInTransaction;

  afterEach(() => {
    Payment.findById = originalPaymentFindById;
    Payment.find = originalPaymentFind;
    Order.findById = originalOrderFindById;
    Inventory.findOne = originalInventoryFindOne;
    payos.getPaymentLinkInformation = originalGetInformation;
    payos.cancelPaymentLink = originalCancelLink;
    transactionModule.runInTransaction = originalRunInTransaction;
  });

  it("PayOS PAID: cập nhật payment/invoice/order và trừ tồn kho đúng một lần", async () => {
    const orderId = new Types.ObjectId().toString();
    const productId = new Types.ObjectId();
    const paymentObjectId = new Types.ObjectId();
    const paymentToUpdate = {
      _id: paymentObjectId,
      id: paymentObjectId.toString(),
      status: PaymentStatus.PENDING,
      paidAt: null as Date | null,
      async save() { return this; },
    };
    const invoice = {
      status: InvoiceStatus.UNPAID,
      paidAt: null as Date | null,
      paymentMethod: null as string | null,
      payment: null as unknown,
      async save() { return this; },
    };
    const orderToUpdate = {
      id: orderId,
      orderType: 1,
      status: OrderStatus.PENDING,
      facility: new Types.ObjectId(),
      paymentMethod: "ONLINE",
      confirmedAt: null as Date | null,
      orderDetails: [{ product: { _id: productId }, quantity: 2 }],
      invoices: [invoice],
      async save() { return this; },
    };
    const inventory = {
      quantity: 7,
      saveCalls: 0,
      async save() { this.saveCalls += 1; return this; },
    };
    const payment = {
      id: paymentToUpdate.id,
      status: PaymentStatus.PENDING,
      payosOrderCode: "123456789",
    } as any;
    const order = { id: orderId, orderType: 1 } as any;

    payos.getPaymentLinkInformation = (async () => ({ status: "PAID" } as any)) as typeof payos.getPaymentLinkInformation;
    payos.cancelPaymentLink = (async () => ({} as any)) as typeof payos.cancelPaymentLink;
    transactionModule.runInTransaction = async (fn) => fn(undefined);
    Payment.findById = ((() => queryResult(paymentToUpdate)) as unknown) as typeof Payment.findById;
    Payment.find = ((() => queryResult([])) as unknown) as typeof Payment.find;
    Order.findById = ((() => queryResult(orderToUpdate)) as unknown) as typeof Order.findById;
    Inventory.findOne = ((() => queryResult(inventory)) as unknown) as typeof Inventory.findOne;

    const service = new PaymentService();
    await service.syncPaymentIfPaid(payment, order);

    assert.equal(paymentToUpdate.status, PaymentStatus.PAID);
    assert.ok(paymentToUpdate.paidAt instanceof Date);
    assert.equal(inventory.quantity, 5);
    assert.equal(inventory.saveCalls, 1);
    assert.equal(orderToUpdate.status, OrderStatus.PROCESSING);
    assert.equal(orderToUpdate.paymentMethod, "PAYOS");
    assert.ok(orderToUpdate.confirmedAt instanceof Date);
    assert.equal(invoice.status, InvoiceStatus.PAID);
    assert.equal(invoice.paymentMethod, "PAYOS");
    assert.equal(invoice.payment, paymentObjectId as any);
  });

  it("PayOS chưa PAID thì không thay đổi dữ liệu", async () => {
    const payment = {
      id: new Types.ObjectId().toString(),
      status: PaymentStatus.PENDING,
      payosOrderCode: "123456789",
    } as any;
    const order = { id: new Types.ObjectId().toString(), orderType: 1 } as any;
    let transactionCalled = false;
    payos.getPaymentLinkInformation = (async () => ({ status: "PENDING" } as any)) as typeof payos.getPaymentLinkInformation;
    transactionModule.runInTransaction = async (fn) => {
      transactionCalled = true;
      return fn(undefined);
    };

    const service = new PaymentService();
    await service.syncPaymentIfPaid(payment, order);

    assert.equal(transactionCalled, false);
    assert.equal(payment.status, PaymentStatus.PENDING);
  });
});

import { Controller, Get, Param, Patch, Req, UseBefore } from "routing-controllers";
import { Service } from "typedi";
import { Auth } from "@/middlewares/auth.middleware";
import { ForbiddenException, EntityNotFoundException } from "@/shared/exceptions/http-exceptions";
import { Invoice, InvoiceStatus } from "../models/invoice.model";
import { AccountDetailsDto, RolePayload } from "@/modules/auth/account.types";
import { Account } from "@/modules/auth/models/account.model";
import { Order } from "@/modules/order/models/order.model";

const STAFF_SLUGS = ["admin", "manager", "staff"];

function isStaff(role: RolePayload | undefined): boolean {
  if (!role) return false;
  return STAFF_SLUGS.includes(role.slug ?? "") || STAFF_SLUGS.includes(role.name ?? "");
}

interface RequestWithUser {
  user?: AccountDetailsDto;
}

function formatInvoice(inv: any) {
  const order = inv.order ?? {};
  const customer = order.customerIdOrder ?? null;
  const facility = order.facility ?? null;
  const items = (order.orderDetails ?? []).map((d: any) => {
    const product = d.product ?? {};
    return {
      productName: product.name ?? "",
      quantity: d.quantity,
      unitPrice: d.unitPrice,
      subtotal: d.quantity * d.unitPrice,
    };
  });
  return {
    id: String(inv._id ?? inv.id),
    invoiceNumber: inv.invoiceNumber ?? null,
    totalAmount: inv.totalAmount,
    status: inv.status,
    paymentMethod: inv.paymentMethod ?? null,
    paidAt: inv.paidAt ?? null,
    notes: inv.notes ?? null,
    createdAt: inv.createdAt,
    updatedAt: inv.updatedAt,
    order: {
      id: String(order._id ?? order.id),
      orderDate: order.orderAt ?? order.orderDate ?? null,
      orderType: order.orderType ?? 1,
      totalAmount: order.totalAmount ?? 0,
      subtotalAmount: order.subtotalAmount ?? 0,
      vatAmount: order.vatAmount ?? 0,
      shippingFee: order.shippingFee ?? 0,
      guestName: order.guestName ?? null,
      guestPhone: order.guestPhone ?? null,
      customer: customer
        ? { id: String(customer._id ?? customer.id), name: customer.name ?? null, email: customer.email ?? null, phone: customer.phone ?? null }
        : null,
      facility: facility
        ? { name: facility.name ?? null, address: facility.address ?? null, phone: facility.phone ?? null }
        : null,
      items,
    },
  };
}

const ORDER_DETAIL_POPULATE = [
  { path: "customerIdOrder" },
  { path: "facility" },
  { path: "orderDetails", populate: { path: "product" } },
];

@Service()
@Controller("/invoices")
export class InvoiceController {
  @Get()
  @UseBefore(Auth)
  async getAll(@Req() req: RequestWithUser) {
    const user = req.user!;
    if (!isStaff(user.role)) {
      throw new ForbiddenException("Không có quyền truy cập");
    }

    // Lấy facilityId của staff từ DB để lọc hóa đơn theo cơ sở
    const account = await Account.findById(user.accountId).select("facility role").populate("role");
    const roleSlug = (account?.role as any)?.slug ?? "";
    const facilityId =
      roleSlug !== "admin" && account?.facility
        ? account.facility
        : undefined;

    let filter: any = { deletedAt: null };
    if (facilityId) {
      // Chỉ lấy hóa đơn của những đơn hàng thuộc cơ sở này
      const orders = await Order.find({ facility: facilityId }).select("_id");
      const orderIds = orders.map((o) => o._id);
      filter.order = { $in: orderIds };
    }

    const invoices = await Invoice.find(filter)
      .populate({ path: "order", populate: ORDER_DETAIL_POPULATE })
      .sort({ createdAt: -1 })
      .lean();
    return { message: "Lấy danh sách hóa đơn thành công", invoices: invoices.map(formatInvoice) };
  }

  @Patch("/:id/mark-paid")
  @UseBefore(Auth)
  async markPaid(@Req() req: RequestWithUser, @Param("id") id: string) {
    if (!isStaff(req.user?.role)) throw new ForbiddenException("Không có quyền");
    const inv = await Invoice.findById(id).populate({ path: "order", populate: ORDER_DETAIL_POPULATE });
    if (!inv) throw new EntityNotFoundException("Không tìm thấy hóa đơn");
    inv.status = InvoiceStatus.PAID;
    inv.paidAt = new Date();
    await inv.save();
    return { message: "Đã đánh dấu thanh toán", invoice: formatInvoice(inv) };
  }

  @Patch("/:id/cancel")
  @UseBefore(Auth)
  async cancel(@Req() req: RequestWithUser, @Param("id") id: string) {
    if (!isStaff(req.user?.role)) throw new ForbiddenException("Không có quyền");
    const inv = await Invoice.findById(id).populate({ path: "order", populate: ORDER_DETAIL_POPULATE });
    if (!inv) throw new EntityNotFoundException("Không tìm thấy hóa đơn");
    inv.status = InvoiceStatus.CANCELLED;
    await inv.save();
    return { message: "Đã hủy hóa đơn", invoice: formatInvoice(inv) };
  }
}

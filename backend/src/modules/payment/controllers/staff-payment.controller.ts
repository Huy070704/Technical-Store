import { Controller, Get, Patch, Param, Req, UseBefore } from "routing-controllers";
import { Service } from "typedi";
import { Auth } from "@/middlewares/auth.middleware";
import { AccountDetailsDto, RolePayload } from "@/modules/auth/account.types";
import { Payment } from "../models/payment.model";
import { ForbiddenException, EntityNotFoundException } from "@/shared/exceptions/http-exceptions";

interface RequestWithUser {
  user?: AccountDetailsDto;
}

const STAFF_SLUGS = ["admin", "manager", "staff"];

function isStaff(role: RolePayload | undefined): boolean {
  if (!role) return false;
  return STAFF_SLUGS.includes(role.slug ?? "") || STAFF_SLUGS.includes(role.name ?? "");
}

function formatPayment(p: any) {
  const order = p.order;
  const customer =
    order?.customerIdOrder
      ? {
          id: (order.customerIdOrder._id ?? order.customerIdOrder).toString(),
          name: order.customerIdOrder.name ?? null,
          email: order.customerIdOrder.email ?? null,
          phone: order.customerIdOrder.phone ?? null,
        }
      : order?.guestName
      ? { id: null, name: order.guestName, email: order.guestEmail ?? null, phone: order.guestPhone ?? null }
      : null;

  return {
    id: p._id.toString(),
    amount: p.amount,
    status: p.status,
    method: p.method,
    payosOrderCode: p.payosOrderCode ?? null,
    paidAt: p.paidAt ?? null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    order: order
      ? {
          id: order._id.toString(),
          orderDate: order.orderAt,
          totalAmount: order.totalAmount,
          customer,
        }
      : null,
  };
}

@Service()
@Controller("/payments")
export class StaffPaymentController {
  @Get()
  @UseBefore(Auth)
  async getAll(@Req() req: RequestWithUser) {
    if (!isStaff(req.user?.role)) {
      throw new ForbiddenException("Không có quyền truy cập");
    }
    const payments = await Payment.find({ deletedAt: null })
      .sort({ createdAt: -1 })
      .populate({
        path: "order",
        select: "orderAt totalAmount guestName guestPhone guestEmail customerIdOrder",
        populate: {
          path: "customerIdOrder",
          select: "name email phone",
        },
      })
      .lean();

    return {
      message: "Lấy danh sách thanh toán thành công",
      payments: payments.map(formatPayment),
    };
  }

  @Patch("/:id/confirm")
  @UseBefore(Auth)
  async confirm(@Req() req: RequestWithUser, @Param("id") id: string) {
    if (!isStaff(req.user?.role)) {
      throw new ForbiddenException("Không có quyền thực hiện thao tác này");
    }
    const payment = await Payment.findById(id)
      .populate({
        path: "order",
        select: "orderAt totalAmount guestName guestPhone guestEmail customerIdOrder",
        populate: { path: "customerIdOrder", select: "name email phone" },
      });
    if (!payment) throw new EntityNotFoundException("Payment");

    payment.status = "PAID";
    payment.paidAt = new Date();
    await payment.save();

    return {
      message: "Xác nhận thanh toán thành công",
      payment: formatPayment(payment.toObject()),
    };
  }
}

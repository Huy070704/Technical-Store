import { z } from "zod";
import { OrderStatus } from "../models/order.model";
import { normalizeVnPhone, isValidVnPhone } from "@/shared/validators/vietnam-phone";
export { parseBody } from "@/shared/validators/parse-body";

export enum PaymentMethodType {
  COD = "COD",
  ONLINE = "ONLINE",
}

const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, "ID không hợp lệ");

// ─── Guest sub-schemas ────────────────────────────────────────────────────────

const guestInfoSchema = z.object({
  fullName: z.string().min(2).max(100),
  phone: z
    .string()
    .transform((v) => normalizeVnPhone(v))
    .refine(isValidVnPhone, { message: "Số điện thoại Việt Nam không hợp lệ" }),
  email: z.string().email("Email không hợp lệ"),
});

const guestCartItemSchema = z.object({
  productId: mongoId,
  quantity: z.number().int().min(1).max(99),
  price: z.number().min(0),
  name: z.string().min(1).max(255),
});

// ─── Create order ─────────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  shippingAddress: z.string().min(10, "Địa chỉ giao hàng tối thiểu 10 ký tự").max(500),
  note: z.string().max(500).optional(),
  paymentMethod: z.nativeEnum(PaymentMethodType, {
    message: "Phương thức thanh toán không hợp lệ",
  }),
  requireInvoice: z.boolean().optional().default(false),
  isGuest: z.boolean().optional().default(false),
  guestInfo: guestInfoSchema.optional(),
  guestCartItems: z.array(guestCartItemSchema).optional(),
  selectedProductIds: z.array(mongoId).optional(),
  guestOtp: z.string().length(6, "Mã OTP phải có đúng 6 chữ số").optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

// ─── Update order status ──────────────────────────────────────────────────────

export const updateOrderSchema = z
  .object({
    status: z.nativeEnum(OrderStatus, {
      message: "Trạng thái đơn hàng không hợp lệ",
    }),
    cancelReason: z.string().min(10).max(200).optional(),
  })
  .refine(
    (data) => data.status !== OrderStatus.CANCELLED || !!data.cancelReason,
    { message: "Lý do hủy phải từ 10-200 ký tự", path: ["cancelReason"] }
  );

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

// ─── In-store order ───────────────────────────────────────────────────────────

const inStoreItemSchema = z.object({
  productId: mongoId,
  quantity: z.number().int().min(1).max(999),
});

export const createInStoreOrderSchema = z.object({
  items: z.array(inStoreItemSchema).min(1, "Danh sách sản phẩm không được trống"),
  paymentMethod: z.enum(["CASH", "TRANSFER"]),
  note: z.string().optional(),
});

export type CreateInStoreOrderInput = z.infer<typeof createInStoreOrderSchema>;

// ─── Collect payment ──────────────────────────────────────────────────────────

export const collectPaymentSchema = z.object({
  amount: z.number().positive("Số tiền phải lớn hơn 0"),
  method: z.string().min(1),
});

export type CollectPaymentInput = z.infer<typeof collectPaymentSchema>;



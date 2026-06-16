import { Types } from "mongoose";

/** Kiểm tra một chuỗi có phải MongoDB ObjectId hợp lệ (24 hex). */
export const isObjectId = (value: string): boolean =>
  Types.ObjectId.isValid(String(value ?? "").trim());

/**
 * Giữ tên cũ để tương thích ngược — nay validate ObjectId thay vì UUID v4
 * (sau khi chuyển sang MongoDB, id là ObjectId).
 */
export const isUuidV4 = isObjectId;

import { Document, Model, Schema, SchemaOptions, Types } from "mongoose";

/**
 * Base schema Mongoose cho mọi model trong ứng dụng.
 *
 * Cung cấp đồng nhất:
 *  - timestamps: createdAt / updatedAt
 *  - soft-delete: trường deletedAt + tự động loại bản ghi đã xoá mềm khỏi mọi truy vấn find/count
 *  - chuyển hoá toJSON/toObject: expose `id` (hex string), ẩn _id/__v/password/deletedAt
 */

/** Biến đổi document → JSON sạch: id thay cho _id, ẩn các field nội bộ & nhạy cảm. */
function baseTransform(_doc: unknown, ret: Record<string, any>) {
  if (ret._id != null) {
    ret.id = typeof ret._id === "object" && "toString" in ret._id ? ret._id.toString() : ret._id;
  }
  delete ret._id;
  delete ret.__v;
  delete ret.password; // không bao giờ trả password ra ngoài
  delete ret.deletedAt; // ẩn cờ soft-delete khỏi response
  return ret;
}

/** Tuỳ chọn cấu hình cho base schema. */
export interface BaseSchemaOptions {
  /** Bật trường name + slug dùng chung. */
  named?: boolean;
  /**
   * Khi `named` bật: nếu true thì chỉ sinh slug khi slug còn trống
   * (giữ slug đã set thủ công).
   * Mặc định false: luôn sinh slug = name.toLowerCase() ở mỗi lần save.
   */
  keepExistingSlug?: boolean;
}

/**
 * Áp dụng cấu hình nền tảng cho một schema. Gọi sau khi đã `new Schema({...})`.
 */
export function applyBaseSchema(schema: Schema, options: BaseSchemaOptions = {}): void {
  // Soft-delete field
  schema.add({ deletedAt: { type: Date, default: null } });

  // name + slug
  if (options.named) {
    schema.add({
      name: { type: String, maxlength: 255, default: null },
      slug: { type: String, maxlength: 255, default: null },
    });
    const keepExisting = options.keepExistingSlug === true;
    schema.pre("save", function (next) {
      const self = this as any; // this la document hien tai
      if (self.name) {
        if (!keepExisting || !self.slug) {
          self.slug = String(self.name).toLowerCase();
        }
      }
      next();
    });
  }

  // timestamps createdAt / updatedAt
  schema.set("timestamps", true);

  // Loại bản ghi đã xoá mềm khỏi mọi truy vấn đọc, trừ khi truyền option { withDeleted: true }
  const softDeleteFilter = function (this: any, next: (err?: any) => void) {
    const options = typeof this.getOptions === "function" ? this.getOptions() : {};
    if (!options.withDeleted) {
      const filter = typeof this.getFilter === "function" ? this.getFilter() : {};
      if (!(filter && Object.prototype.hasOwnProperty.call(filter, "deletedAt"))) {
        this.where({ deletedAt: null });
      }
    }
    next();
  };
  schema.pre(/^find/, softDeleteFilter as any);
  schema.pre("countDocuments", softDeleteFilter as any);

  // softRemove ở mức instance: đánh dấu deletedAt thay vì xoá thật
  schema.methods.softRemove = async function () {
    this.deletedAt = new Date();
    return this.save();
  };

  // softRemove ở mức static: nhận 1 document, mảng document, hoặc id
  schema.statics.softRemove = async function (docs: any) {
    const arr = Array.isArray(docs) ? docs : [docs];
    const ids = arr
      .map((d) => (d && typeof d === "object" && "_id" in d ? d._id : d))
      .filter((id) => id != null);
    if (ids.length === 0) return docs;
    await this.updateMany({ _id: { $in: ids } }, { deletedAt: new Date() });
    return docs;
  };

  // Serialize sạch
  const transformOpts: SchemaOptions["toJSON"] = { virtuals: true, transform: baseTransform };
  schema.set("toJSON", transformOpts as any);
  schema.set("toObject", transformOpts as any);
}

/** Trường dùng chung mọi document. */
export interface BaseFields {
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

/** Trường dùng chung cho document có name + slug. */
export interface NamedFields extends BaseFields {
  name?: string | null;
  slug?: string | null;
}

/** Phương thức instance bổ sung (soft delete). */
export interface SoftDeleteMethods {
  softRemove(): Promise<any>;
}

/** Static bổ sung trên model (soft delete hàng loạt). */
export interface SoftDeleteStatics<T> {
  softRemove(docs: T | T[] | Types.ObjectId | Types.ObjectId[]): Promise<any>;
}

/** Kiểu Model có kèm static softRemove. */
export type ModelWithSoftDelete<TDoc> = Model<TDoc> & SoftDeleteStatics<TDoc>;

/** Document Mongoose kèm phương thức softRemove. */
export type BaseDocument<TFields> = Document<Types.ObjectId> & TFields & SoftDeleteMethods & { model?: any };


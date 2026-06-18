import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { FacilityDocument } from "@/modules/facility/facility.model";
import type { SupplierDocument } from "../supplier/supplier.model";
import type { AccountDocument } from "@/modules/auth/account.model";
import type { ImportReceiptDetailDocument } from "./importReceiptDetail.model";

export interface ImportReceiptFields extends BaseFields {
  facility: Types.ObjectId | FacilityDocument;
  supplier: Types.ObjectId | SupplierDocument;
  createdBy: Types.ObjectId | AccountDocument;
  importDate: Date;
  totalAmount: number;
  notes?: string;
}

export type ImportReceiptDocument = BaseDocument<ImportReceiptFields> & {
  details?: ImportReceiptDetailDocument[];
};

const ImportReceiptSchema = new Schema<ImportReceiptDocument>(
  {
    facility: { type: Schema.Types.ObjectId, ref: "Facility", required: true },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "Account", required: true },
    importDate: { type: Date, default: () => new Date() },
    totalAmount: { type: Number, default: 0 },
    notes: { type: String, default: null },
  },
  { collection: "import_receipts" }
);

applyBaseSchema(ImportReceiptSchema);

ImportReceiptSchema.virtual("details", {
  ref: "ImportReceiptDetail",
  localField: "_id",
  foreignField: "importReceipt",
});

export const ImportReceipt = model<
  ImportReceiptDocument,
  ModelWithSoftDelete<ImportReceiptDocument>
>("ImportReceipt", ImportReceiptSchema);

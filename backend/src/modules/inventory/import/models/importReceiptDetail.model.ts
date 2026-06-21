import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { ImportReceiptDocument } from "./importReceipt.model";
import type { ProductDocument } from "../../../product/models/product.model";

export interface ImportReceiptDetailFields extends BaseFields {
  importReceipt: Types.ObjectId | ImportReceiptDocument;
  product: Types.ObjectId | ProductDocument;
  quantity: number;
  unitPrice: number;
}

export type ImportReceiptDetailDocument = BaseDocument<ImportReceiptDetailFields>;

const ImportReceiptDetailSchema = new Schema<ImportReceiptDetailDocument>(
  {
    importReceipt: { type: Schema.Types.ObjectId, ref: "ImportReceipt", required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
  },
  { collection: "import_receipt_details" }
);

applyBaseSchema(ImportReceiptDetailSchema);

export const ImportReceiptDetail = model<
  ImportReceiptDetailDocument,
  ModelWithSoftDelete<ImportReceiptDetailDocument>
>("ImportReceiptDetail", ImportReceiptDetailSchema);

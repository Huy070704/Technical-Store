import { model, Schema } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  ModelWithSoftDelete,
  NamedFields,
} from "@/shared/mongoose/base";

export interface SupplierFields extends NamedFields {
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export type SupplierDocument = BaseDocument<SupplierFields> & {
  importReceipts?: any[];
};

const SupplierSchema = new Schema<SupplierDocument>(
  {
    contactPerson: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    address: { type: String, default: null },
  },
  { collection: "suppliers" }
);

applyBaseSchema(SupplierSchema, { named: true });

SupplierSchema.virtual("importReceipts", {
  ref: "ImportReceipt",
  localField: "_id",
  foreignField: "supplier",
});

export const Supplier = model<SupplierDocument, ModelWithSoftDelete<SupplierDocument>>(
  "Supplier",
  SupplierSchema
);

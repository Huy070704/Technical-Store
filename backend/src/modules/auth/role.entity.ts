import { model, Schema } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  ModelWithSoftDelete,
  NamedFields,
} from "@/shared/mongoose/base";

// Role: chỉ có name + slug (kế thừa NamedEntity). Quan hệ accounts là OneToMany — phía Account giữ ref.
export interface RoleFields extends NamedFields {}

export type RoleDocument = BaseDocument<RoleFields>;

const RoleSchema = new Schema<RoleDocument>(
  {},
  { collection: "roles" }
);

applyBaseSchema(RoleSchema, { named: true });

export const Role = model<RoleDocument, ModelWithSoftDelete<RoleDocument>>(
  "Role",
  RoleSchema
);

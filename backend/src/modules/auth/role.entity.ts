import { model, Schema } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  ModelWithSoftDelete,
  NamedFields,
} from "@/shared/mongoose/base";

// Role: chỉ có name + slug. Quan hệ 1-nhiều với Account — phía Account giữ ref roleId.
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

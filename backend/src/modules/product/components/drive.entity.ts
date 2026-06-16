import { model, SchemaDefinition } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "./component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";

export interface DriveFields {
  brand: string;
  model: string;
  type: string;
  capacityGb: number;
  interface: string;
}

export const driveFields: SchemaDefinition = {
  brand: { type: String, required: true },
  model: { type: String, required: true },
  type: { type: String, required: true },
  capacityGb: { type: Number, required: true },
  interface: { type: String, required: true },
};

export type DriveDocument = ComponentDocument<DriveFields>;

const DriveSchema = buildComponentSchema<DriveDocument>(driveFields, "drives");

export const Drive = model<DriveDocument, ModelWithSoftDelete<DriveDocument>>("Drive", DriveSchema);

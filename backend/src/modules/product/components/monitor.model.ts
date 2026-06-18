import { model, SchemaDefinition } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "./component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";

export interface MonitorFields {
  brand: string;
  model: string;
  sizeInch: number;
  resolution: string;
  refreshRate: number;
  panelType: string;
}

export const monitorFields: SchemaDefinition = {
  brand: { type: String, required: true },
  model: { type: String, required: true },
  sizeInch: { type: Number, required: true },
  resolution: { type: String, required: true },
  refreshRate: { type: Number, required: true },
  panelType: { type: String, required: true },
};

export type MonitorDocument = ComponentDocument<MonitorFields>;

const MonitorSchema = buildComponentSchema<MonitorDocument>(monitorFields, "monitors");

export const Monitor = model<MonitorDocument, ModelWithSoftDelete<MonitorDocument>>("Monitor", MonitorSchema);

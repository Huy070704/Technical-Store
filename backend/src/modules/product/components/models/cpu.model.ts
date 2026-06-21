import { model, SchemaDefinition } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "../component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";

export interface CPUFields {
  model?: string;
  cores: number;
  threads: number;
  baseClock: string;
  boostClock: string;
  socket: string;
  architecture: string;
  tdp: number;
  integratedGraphics?: string;
}

export const cpuFields: SchemaDefinition = {
  model: { type: String, default: null },
  cores: { type: Number, required: true },
  threads: { type: Number, required: true },
  baseClock: { type: String, required: true },
  boostClock: { type: String, required: true },
  socket: { type: String, required: true },
  architecture: { type: String, required: true },
  tdp: { type: Number, required: true },
  integratedGraphics: { type: String, default: null },
};

export type CPUDocument = ComponentDocument<CPUFields>;

const CPUSchema = buildComponentSchema<CPUDocument>(cpuFields, "cpus");

export const CPU = model<CPUDocument, ModelWithSoftDelete<CPUDocument>>("CPU", CPUSchema);

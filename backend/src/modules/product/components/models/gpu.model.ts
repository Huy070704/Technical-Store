import { model, SchemaDefinition } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "../component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";

export interface GPUFields {
  brand: string;
  model: string;
  vram: number;
  chipset: string;
  memoryType: string;
  lengthMm: number;
  tdp?: number;
}

export const gpuFields: SchemaDefinition = {
  brand: { type: String, required: true },
  model: { type: String, required: true },
  vram: { type: Number, required: true },
  chipset: { type: String, required: true },
  memoryType: { type: String, required: true },
  lengthMm: { type: Number, required: true },
  tdp: { type: Number, default: null },
};

export type GPUDocument = ComponentDocument<GPUFields>;

const GPUSchema = buildComponentSchema<GPUDocument>(gpuFields, "gpus");

export const GPU = model<GPUDocument, ModelWithSoftDelete<GPUDocument>>("GPU", GPUSchema);

import { model, SchemaDefinition } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "./component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";

export interface MotherboardFields {
  brand: string;
  model: string;
  chipset: string;
  socket: string;
  formFactor: string;
  ramSlots: number;
  maxRam: number;
  ramType?: string;
  supportedDriveInterfaces?: string;
}

export const motherboardFields: SchemaDefinition = {
  brand: { type: String, required: true },
  model: { type: String, required: true },
  chipset: { type: String, required: true },
  socket: { type: String, required: true },
  formFactor: { type: String, required: true },
  ramSlots: { type: Number, required: true },
  maxRam: { type: Number, required: true },
  ramType: { type: String, default: null },
  supportedDriveInterfaces: { type: String, default: null },
};

export type MotherboardDocument = ComponentDocument<MotherboardFields>;

const MotherboardSchema = buildComponentSchema<MotherboardDocument>(motherboardFields, "motherboards");

export const Motherboard = model<MotherboardDocument, ModelWithSoftDelete<MotherboardDocument>>("Motherboard", MotherboardSchema);

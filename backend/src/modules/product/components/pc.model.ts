import { model, SchemaDefinition } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "./component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";

export interface PCFields {
  brand: string;
  model: string;
  processor: string;
  ramGb: number;
  storageGb: number;
  storageType: string;
  graphics: string;
  formFactor: string;
  powerSupplyWattage: number;
  operatingSystem: string;
}

export const pcFields: SchemaDefinition = {
  brand: { type: String, required: true },
  model: { type: String, required: true },
  processor: { type: String, required: true },
  ramGb: { type: Number, required: true },
  storageGb: { type: Number, required: true },
  storageType: { type: String, required: true },
  graphics: { type: String, required: true },
  formFactor: { type: String, required: true },
  powerSupplyWattage: { type: Number, required: true },
  operatingSystem: { type: String, required: true },
};

export type PCDocument = ComponentDocument<PCFields>;

const PCSchema = buildComponentSchema<PCDocument>(pcFields, "pcs");

export const PC = model<PCDocument, ModelWithSoftDelete<PCDocument>>("PC", PCSchema);

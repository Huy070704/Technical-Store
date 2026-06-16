import { model, SchemaDefinition } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "./component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";

export interface PSUFields {
  brand: string;
  model: string;
  wattage: number;
  efficiencyRating: string;
  modular: string;
}

export const psuFields: SchemaDefinition = {
  brand: { type: String, required: true },
  model: { type: String, required: true },
  wattage: { type: Number, required: true },
  efficiencyRating: { type: String, required: true },
  modular: { type: String, required: true },
};

export type PSUDocument = ComponentDocument<PSUFields>;

const PSUSchema = buildComponentSchema<PSUDocument>(psuFields, "psus");

export const PSU = model<PSUDocument, ModelWithSoftDelete<PSUDocument>>("PSU", PSUSchema);

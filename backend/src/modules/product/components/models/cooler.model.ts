import { model, SchemaDefinition } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "../component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";

export interface CoolerFields {
  brand: string;
  model: string;
  type: string;
  supportedSockets: string;
  fanSizeMm: number;
}

export const coolerFields: SchemaDefinition = {
  brand: { type: String, required: true },
  model: { type: String, required: true },
  type: { type: String, required: true },
  supportedSockets: { type: String, required: true },
  fanSizeMm: { type: Number, required: true },
};

export type CoolerDocument = ComponentDocument<CoolerFields>;

const CoolerSchema = buildComponentSchema<CoolerDocument>(coolerFields, "coolers");

export const Cooler = model<CoolerDocument, ModelWithSoftDelete<CoolerDocument>>("Cooler", CoolerSchema);

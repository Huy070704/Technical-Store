import { model, SchemaDefinition } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "../component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";

export interface RAMFields {
  brand: string;
  model: string;
  capacityGb: number;
  speedMhz: number;
  type: string;
}

export const ramFields: SchemaDefinition = {
  brand: { type: String, required: true },
  model: { type: String, required: true },
  capacityGb: { type: Number, required: true },
  speedMhz: { type: Number, required: true },
  type: { type: String, required: true },
};

export type RAMDocument = ComponentDocument<RAMFields>;

const RAMSchema = buildComponentSchema<RAMDocument>(ramFields, "rams");

export const RAM = model<RAMDocument, ModelWithSoftDelete<RAMDocument>>("RAM", RAMSchema);

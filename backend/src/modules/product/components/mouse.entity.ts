import { model, SchemaDefinition } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "./component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";

export interface MouseFields {
  type: string;
  dpi: number;
  connectivity: string;
  hasRgb: boolean;
}

export const mouseFields: SchemaDefinition = {
  type: { type: String, required: true },
  dpi: { type: Number, required: true },
  connectivity: { type: String, required: true },
  hasRgb: { type: Boolean, required: true },
};

export type MouseDocument = ComponentDocument<MouseFields>;

const MouseSchema = buildComponentSchema<MouseDocument>(mouseFields, "mice");

export const Mouse = model<MouseDocument, ModelWithSoftDelete<MouseDocument>>("Mouse", MouseSchema);

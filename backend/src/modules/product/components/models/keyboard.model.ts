import { model, SchemaDefinition } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "../component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";

export interface KeyboardFields {
  type: string;
  switchType: string;
  connectivity: string;
  layout: string;
  hasRgb: boolean;
}

export const keyboardFields: SchemaDefinition = {
  type: { type: String, required: true },
  switchType: { type: String, required: true },
  connectivity: { type: String, required: true },
  layout: { type: String, required: true },
  hasRgb: { type: Boolean, required: true },
};

export type KeyboardDocument = ComponentDocument<KeyboardFields>;

const KeyboardSchema = buildComponentSchema<KeyboardDocument>(keyboardFields, "keyboards");

export const Keyboard = model<KeyboardDocument, ModelWithSoftDelete<KeyboardDocument>>("Keyboard", KeyboardSchema);

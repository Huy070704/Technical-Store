import { model, SchemaDefinition } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "./component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";

export interface HeadsetFields {
  hasMicrophone: boolean;
  connectivity: string;
  surroundSound: boolean;
}

export const headsetFields: SchemaDefinition = {
  hasMicrophone: { type: Boolean, required: true },
  connectivity: { type: String, required: true },
  surroundSound: { type: Boolean, required: true },
};

export type HeadsetDocument = ComponentDocument<HeadsetFields>;

const HeadsetSchema = buildComponentSchema<HeadsetDocument>(headsetFields, "headsets");

export const Headset = model<HeadsetDocument, ModelWithSoftDelete<HeadsetDocument>>("Headset", HeadsetSchema);

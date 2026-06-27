import { model, SchemaDefinition } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "../component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";

export interface NetworkCardFields {
  type: string;
  interface: string;
  speedMbps: number;
}

export const networkCardFields: SchemaDefinition = {
  type: { type: String, required: true },
  interface: { type: String, required: true },
  speedMbps: { type: Number, required: true },
};

export type NetworkCardDocument = ComponentDocument<NetworkCardFields>;

const NetworkCardSchema = buildComponentSchema<NetworkCardDocument>(networkCardFields, "network_cards");

export const NetworkCard = model<NetworkCardDocument, ModelWithSoftDelete<NetworkCardDocument>>("NetworkCard", NetworkCardSchema);

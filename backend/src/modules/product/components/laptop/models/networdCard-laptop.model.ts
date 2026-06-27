import { model } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "../../component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";
import { networkCardFields, NetworkCardFields } from "../../models/networkCard.model";

export type NetworkCardLaptopDocument = ComponentDocument<NetworkCardFields>;

const NetworkCardLaptopSchema = buildComponentSchema<NetworkCardLaptopDocument>(
  networkCardFields,
  "network-cards-laptop"
);

export const NetworkCardLaptop = model<
  NetworkCardLaptopDocument,
  ModelWithSoftDelete<NetworkCardLaptopDocument>
>("NetworkCardLaptop", NetworkCardLaptopSchema);

import { model } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "../../component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";
import { ramFields, RAMFields } from "../../models/ram.model";

export type RAMLaptopDocument = ComponentDocument<RAMFields>;

const RAMLaptopSchema = buildComponentSchema<RAMLaptopDocument>(ramFields, "rams-laptop");

export const RAMLaptop = model<RAMLaptopDocument, ModelWithSoftDelete<RAMLaptopDocument>>(
  "RAMLaptop",
  RAMLaptopSchema
);

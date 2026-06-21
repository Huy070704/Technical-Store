import { model } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "../../component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";
import { gpuFields, GPUFields } from "../../models/gpu.model";

export type GPULaptopDocument = ComponentDocument<GPUFields>;

const GPULaptopSchema = buildComponentSchema<GPULaptopDocument>(gpuFields, "gpus-laptop");

export const GPULaptop = model<GPULaptopDocument, ModelWithSoftDelete<GPULaptopDocument>>(
  "GPULaptop",
  GPULaptopSchema
);

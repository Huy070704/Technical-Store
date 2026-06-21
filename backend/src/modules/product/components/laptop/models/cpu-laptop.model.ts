import { model } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "../../component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";
import { cpuFields, CPUFields } from "../../models/cpu.model";

// CPULaptop: cùng cấu trúc CPU nhưng collection riêng (OneToMany Laptop là phía Laptop giữ ref).
export type CPULaptopDocument = ComponentDocument<CPUFields>;

const CPULaptopSchema = buildComponentSchema<CPULaptopDocument>(cpuFields, "cpus-laptop");

export const CPULaptop = model<CPULaptopDocument, ModelWithSoftDelete<CPULaptopDocument>>(
  "CPULaptop",
  CPULaptopSchema
);

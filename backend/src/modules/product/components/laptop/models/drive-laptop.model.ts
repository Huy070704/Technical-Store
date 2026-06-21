import { model } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "../../component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";
import { driveFields, DriveFields } from "../../models/drive.model";

export type DriveLaptopDocument = ComponentDocument<DriveFields>;

const DriveLaptopSchema = buildComponentSchema<DriveLaptopDocument>(driveFields, "drives-laptop");

export const DriveLaptop = model<DriveLaptopDocument, ModelWithSoftDelete<DriveLaptopDocument>>(
  "DriveLaptop",
  DriveLaptopSchema
);

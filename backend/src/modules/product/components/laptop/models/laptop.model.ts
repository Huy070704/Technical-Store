import { model, Schema, Types } from "mongoose";
import { applyBaseSchema, BaseDocument, ModelWithSoftDelete } from "@/shared/mongoose/base";
import type { ProductDocument } from "../../../models/product.model";

/**
 * Laptop — OneToOne với Product, ManyToOne tới các linh kiện laptop
 * (cpuLaptop, gpuLaptop, ramLaptop, drive, networkCard).
 */
export interface LaptopFields {
  product: Types.ObjectId | ProductDocument;
  brand?: string;
  model?: string;
  screenSize?: number;
  screenType?: string;
  resolution?: string;
  batteryLifeHours?: number;
  weightKg?: number;
  os?: string;
  ramCount?: number;
  drive?: Types.ObjectId;
  networkCard?: Types.ObjectId;
  cpuLaptop?: Types.ObjectId;
  gpuLaptop?: Types.ObjectId;
  ramLaptop?: Types.ObjectId;
}

export type LaptopDocument = BaseDocument<LaptopFields>;

const LaptopSchema = new Schema<any>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", unique: true, sparse: true },
    brand: { type: String, maxlength: 50, default: null },
    model: { type: String, maxlength: 100, default: null },
    screenSize: { type: Number, default: null },
    screenType: { type: String, maxlength: 50, default: null },
    resolution: { type: String, maxlength: 50, default: null },
    batteryLifeHours: { type: Number, default: null },
    weightKg: { type: Number, default: null },
    os: { type: String, maxlength: 50, default: null },
    ramCount: { type: Number, default: null },
    drive: { type: Schema.Types.ObjectId, ref: "DriveLaptop", default: null },
    networkCard: { type: Schema.Types.ObjectId, ref: "NetworkCardLaptop", default: null },
    cpuLaptop: { type: Schema.Types.ObjectId, ref: "CPULaptop", default: null },
    gpuLaptop: { type: Schema.Types.ObjectId, ref: "GPULaptop", default: null },
    ramLaptop: { type: Schema.Types.ObjectId, ref: "RAMLaptop", default: null },
  },
  { collection: "laptops" }
);

applyBaseSchema(LaptopSchema);

export const Laptop = model<LaptopDocument, ModelWithSoftDelete<LaptopDocument>>("Laptop", LaptopSchema);

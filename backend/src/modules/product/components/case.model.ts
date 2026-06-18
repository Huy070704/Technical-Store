import { model, SchemaDefinition } from "mongoose";
import { buildComponentSchema, ComponentDocument } from "./component.base";
import { ModelWithSoftDelete } from "@/shared/mongoose/base";

export interface CaseFields {
  brand: string;
  model: string;
  formFactorSupport: string;
  hasRgb: boolean;
  sidePanelType: string;
  maxGpuLengthMm?: number;
  psuType?: string;
}

export const caseFields: SchemaDefinition = {
  brand: { type: String, required: true },
  model: { type: String, required: true },
  formFactorSupport: { type: String, required: true },
  hasRgb: { type: Boolean, required: true },
  sidePanelType: { type: String, required: true },
  maxGpuLengthMm: { type: Number, default: null },
  psuType: { type: String, default: null },
};

export type CaseDocument = ComponentDocument<CaseFields>;

const CaseSchema = buildComponentSchema<CaseDocument>(caseFields, "cases");

export const Case = model<CaseDocument, ModelWithSoftDelete<CaseDocument>>("Case", CaseSchema);

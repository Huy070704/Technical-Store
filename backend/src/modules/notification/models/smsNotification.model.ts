import { model, Schema, Types } from "mongoose";
import {
  applyBaseSchema,
  BaseDocument,
  BaseFields,
  ModelWithSoftDelete,
} from "@/shared/mongoose/base";
import type { AccountDocument } from "../../auth/models/account.model";

export interface SMSNotificationFields extends BaseFields {
  account: Types.ObjectId | AccountDocument;
  message: string;
  status: string;
  sentAt: Date;
}

export type SMSNotificationDocument = BaseDocument<SMSNotificationFields>;

const SMSNotificationSchema = new Schema<SMSNotificationDocument>(
  {
    account: { type: Schema.Types.ObjectId, ref: "Account" },
    message: { type: String, required: true },
    status: { type: String, required: true },
    sentAt: { type: Date, required: true },
  },
  { collection: "sms_notifications" }
);

applyBaseSchema(SMSNotificationSchema);

export const SMSNotification = model<
  SMSNotificationDocument,
  ModelWithSoftDelete<SMSNotificationDocument>
>("SMSNotification", SMSNotificationSchema);

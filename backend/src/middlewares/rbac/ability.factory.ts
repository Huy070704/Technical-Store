// Bang quyen cua nguoi dung
import {
  AbilityBuilder,
  InferSubjects,
  MongoAbility,
  createMongoAbility,
} from "@casl/ability";
import { Account } from "../../modules/auth/models/account.model";
import { Image } from "../../modules/image/models/image.model";
import { Role } from "../../modules/auth/models/role.model";
import { Product } from "../../modules/product/models/product.model";
import { Case } from "../../modules/product/components/models/case.model";
import { Mouse } from "../../modules/product/components/models/mouse.model";
import { PC } from "../../modules/product/components/models/pc.model";
import { Drive } from "../../modules/product/components/models/drive.model";
import { RAM } from "../../modules/product/components/models/ram.model";
import { Headset } from "../../modules/product/components/models/headset.model";
import { Laptop } from "../../modules/product/components/laptop/models/laptop.model";
import { NetworkCard } from "../../modules/product/components/models/networkCard.model";
import { GPU } from "../../modules/product/components/models/gpu.model";
import { Keyboard } from "../../modules/product/components/models/keyboard.model";
import { CPU } from "../../modules/product/components/models/cpu.model";
import { Motherboard } from "../../modules/product/components/models/motherboard.model";
import { Cooler } from "../../modules/product/components/models/cooler.model";
import { PSU } from "../../modules/product/components/models/psu.model";
import { Monitor } from "../../modules/product/components/models/monitor.model";
import { Order } from "../../modules/order/models/order.model";
import { Invoice } from "../../modules/payment/models/invoice.model";
import { Feedback } from "../../modules/feedback/models/feedback.model";

export type Actions =
  | "manage"
  | "create"
  | "read"
  | "update"
  | "delete"
  | "cancel";

export type Subjects =
  | InferSubjects<
      | typeof Product
      | typeof Case
      | typeof Mouse
      | typeof PC
      | typeof Drive
      | typeof RAM
      | typeof Headset
      | typeof Laptop
      | typeof NetworkCard
      | typeof GPU
      | typeof Keyboard
      | typeof CPU
      | typeof Motherboard
      | typeof Cooler
      | typeof PSU
      | typeof Monitor
      | typeof Account
      | typeof Order
      | typeof Invoice
      | typeof Image
      | typeof Feedback
      | typeof Role
    >
  | "all";

export type AppAbility = MongoAbility<[Actions, Subjects]>;

const PRODUCT_ENTITIES = [
  Product, Case, Mouse, PC, Drive, RAM, Headset,
  Laptop, NetworkCard, GPU, Keyboard, CPU, Motherboard, Cooler, PSU, Monitor,
] as const;

export function defineAbilityFor(role: string, user?: any): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<MongoAbility<[Actions, Subjects]>>(
    createMongoAbility
  );

  switch (role) {
    case "admin": {
      can("manage", "all");
      PRODUCT_ENTITIES.forEach((entity) => {
        cannot("manage", entity as any);
      });
      break;
    }

    case "manager": {
      can("manage", Account);
      can("read", Role);

      PRODUCT_ENTITIES.forEach((entity) => {
        can("manage", entity as any);
      });

      can("read", Order);
      can("read", Invoice);
      can("manage", Feedback);
      break;
    }

    case "staff": {
      PRODUCT_ENTITIES.forEach((entity) => {
        can("manage", entity as any);
      });

      can("read",   Order);
      can("update", Order);
      can("read",   Invoice);
      can("update", Invoice, {
        status: { $in: ["UNPAID", "PAID", "CANCELLED"] } as any,
      });
      can("manage", Image);

      can("read",   Account, { email: user?.email });
      can("update", Account);
      break;
    }

    case "customer": {
      can("read",   Invoice);
      can("read",   Feedback);
      can("create", Feedback);
      can("create", Order);
      can("cancel", Order, { customerIdOrder: user?.accountId } as any);
      
      can("update", Feedback, { customer: user?.accountId } as any);
      can("delete", Feedback, { customer: user?.accountId } as any);
      can("read",   Order,    { customerIdOrder: user?.accountId } as any);
      
      can("read",   Account,  { _id: user?.accountId } as any);
      can("update", Account,  { _id: user?.accountId } as any);
      can("delete", Account,  { _id: user?.accountId } as any);
      break;
    }

    default: {
      break;
    }
  }

  return build({
    detectSubjectType: (item: any) =>
      typeof item === "function" ? item : item?.constructor,
  });
}

import {
  AbilityBuilder,
  ExtractSubjectType,
  InferSubjects,
  MongoAbility,
  createMongoAbility,
} from "@casl/ability";
import { Product } from "@/product/product.entity";
import { Case } from "@/product/components/case.entity";
import { Mouse } from "@/product/components/mouse.entity";
import { PC } from "@/product/components/pc.entity";
import { Drive } from "@/product/components/drive.entity";
import { RAM } from "@/product/components/ram.entity";
import { Headset } from "@/product/components/headset.entity";
import { Laptop } from "@/product/components/laptop/laptop.entity";
import { NetworkCard } from "@/product/components/networkCard.entity";
import { GPU } from "@/product/components/gpu.entity";
import { Keyboard } from "@/product/components/keyboard.entity";
import { CPU } from "@/product/components/cpu.entity";
import { Motherboard } from "@/product/components/motherboard.entity";
import { Cooler } from "@/product/components/cooler.entity";
import { PSU } from "@/product/components/psu.entity";
import { Monitor } from "@/product/components/monitor.entity";
import { Account } from "@/auth/account/account.entity";
import { Order } from "@/order/order.entity";
import { Invoice } from "@/payment/invoice.entity";
import { Feedback } from "@/feedback/feedback.entity";
import { Image } from "@/image/image.entity";
import { Role } from "@/auth/role/role.entity";

export type Actions =
  | "manage"
  | "create"
  | "read"
  | "update"
  | "delete"
  | "cancel";

export type ProductRelated =
  | Product
  | Case
  | Mouse
  | PC
  | Drive
  | RAM
  | Headset
  | Laptop
  | NetworkCard
  | GPU
  | Keyboard
  | CPU
  | Motherboard
  | Cooler
  | PSU
  | Monitor;

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

export function defineAbilityFor(role: string, user?: Account): AppAbility {
  const { can, build } = new AbilityBuilder<MongoAbility<[Actions, Subjects]>>(
    createMongoAbility
  );

  switch (role) {
    case "admin": {
      can("manage", "all");
      break;
    }
    case "staff": {
      [
        Product,
        Case,
        Mouse,
        PC,
        Drive,
        RAM,
        Headset,
        Laptop,
        NetworkCard,
        GPU,
        Keyboard,
        CPU,
        Motherboard,
        Cooler,
        PSU,
        Monitor,
      ].forEach((entity) => {
        can("manage", entity);
      });
      can("read", Invoice);
      can("update", Invoice, {
        status: { $in: ["UNPAID", "PAID", "CANCELLED"] } as any,
      });
      can("manage", Image);
      can("manage", Feedback);
      can("read", Account, { phone: user?.phone });
      can("update", Account, { phone: user?.phone });
      break;
    }
    case "manager": {
      can("manage", Account);
      can("read", Role);
      break;
    }
    case "shipper": {
      can("update", Order, {
        status: { $in: ["PENDING", "SHIPPING", "DELIVERED"] } as any,
      });
      can("read", Account, { phone: user?.phone });
      can("update", Account, { phone: user?.phone });
      break;
    }
    case "customer": {
      can("read", Invoice);
      can("read", Feedback);
      can("create", Feedback);
      can("update", Feedback, { account: { phone: user?.phone } });
      can("delete", Feedback, { account: { phone: user?.phone } });
      can("read", Order, { customer: { phone: user?.phone } });
      can("read", Account, { phone: user?.phone });
      can("update", Account, { phone: user?.phone });
      can("delete", Account, { phone: user?.phone });
      break;
    }
    case "manager": {
      can("manage", Account, { role: { name: { $ne: "admin" }}} as any);
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

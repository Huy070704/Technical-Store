import {
  AbilityBuilder,
  InferSubjects,
  MongoAbility,
  createMongoAbility,
} from "@casl/ability";
import { Product } from "@/modules/product/entities/product.entity";
import { Case } from "@/modules/product/entities/components/case.entity";
import { Mouse } from "@/modules/product/entities/components/mouse.entity";
import { PC } from "@/modules/product/entities/components/pc.entity";
import { Drive } from "@/modules/product/entities/components/drive.entity";
import { RAM } from "@/modules/product/entities/components/ram.entity";
import { Headset } from "@/modules/product/entities/components/headset.entity";
import { Laptop } from "@/modules/product/entities/components/laptop/laptop.entity";
import { NetworkCard } from "@/modules/product/entities/components/networkCard.entity";
import { GPU } from "@/modules/product/entities/components/gpu.entity";
import { Keyboard } from "@/modules/product/entities/components/keyboard.entity";
import { CPU } from "@/modules/product/entities/components/cpu.entity";
import { Motherboard } from "@/modules/product/entities/components/motherboard.entity";
import { Cooler } from "@/modules/product/entities/components/cooler.entity";
import { PSU } from "@/modules/product/entities/components/psu.entity";
import { Monitor } from "@/modules/product/entities/components/monitor.entity";
import { Account } from "@/modules/auth/entities/account.entity";
import { Order } from "@/modules/order/entities/order.entity";
import { Invoice } from "@/modules/payment/entities/invoice.entity";
import { Feedback } from "@/modules/feedback/entities/feedback.entity";
import { Image } from "@/modules/image/entities/image.entity";
import { Role } from "@/modules/auth/entities/role.entity";

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

export function defineAbilityFor(role: string, user?: Account): AppAbility {
  const { can, build } = new AbilityBuilder<MongoAbility<[Actions, Subjects]>>(
    createMongoAbility
  );

  switch (role) {
    case "admin": {
      can("manage", "all");
      break;
    }

    case "manager": {
      can("manage", Account);
      can("read", Role);
      break;
    }

    case "staff": {
      const productEntities = [
        Product, Case, Mouse, PC, Drive, RAM, Headset,
        Laptop, NetworkCard, GPU, Keyboard, CPU, Motherboard, Cooler, PSU, Monitor,
      ] as const;

      productEntities.forEach((entity) => {
        can("manage", entity as any);
      });

      can("read",   Invoice);
      can("update", Invoice, {
        status: { $in: ["UNPAID", "PAID", "CANCELLED"] } as any,
      });
      can("manage", Image);
      can("manage", Feedback);

      can("read",   Account, { email: user?.email });
      can("update", Account, { email: user?.email });
      break;
    }

    case "shipper": {
      can("update", Order, {
        status: { $in: ["PENDING", "SHIPPING", "DELIVERED"] } as any,
      });
      can("read",   Account, { email: user?.email });
      can("update", Account, { email: user?.email });
      break;
    }

    case "customer": {
      can("read",   Invoice);
      can("read",   Feedback);
      can("create", Feedback);
      can("update", Feedback, { account: { email: user?.email } });
      can("delete", Feedback, { account: { email: user?.email } });
      can("read",   Order, { customer: { email: user?.email } });
      can("read",   Account, { email: user?.email });
      can("update", Account, { email: user?.email });
      can("delete", Account, { email: user?.email });
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

// Bang quyen cua nguoi dung
import {
  AbilityBuilder,
  InferSubjects,
  MongoAbility,
  createMongoAbility,
} from "@casl/ability";
import { Account } from "@/modules/auth/account.model";
import { Image } from "@/modules/image/image.model";
import { Role } from "@/modules/auth/role.model";
import { Product } from "@/modules/product/product.model";
import { Case } from "@/modules/product/components/case.model";
import { Mouse } from "@/modules/product/components/mouse.model";
import { PC } from "@/modules/product/components/pc.model";
import { Drive } from "@/modules/product/components/drive.model";
import { RAM } from "@/modules/product/components/ram.model";
import { Headset } from "@/modules/product/components/headset.model";
import { Laptop } from "@/modules/product/components/laptop/laptop.model";
import { NetworkCard } from "@/modules/product/components/networkCard.model";
import { GPU } from "@/modules/product/components/gpu.model";
import { Keyboard } from "@/modules/product/components/keyboard.model";
import { CPU } from "@/modules/product/components/cpu.model";
import { Motherboard } from "@/modules/product/components/motherboard.model";
import { Cooler } from "@/modules/product/components/cooler.model";
import { PSU } from "@/modules/product/components/psu.model";
import { Monitor } from "@/modules/product/components/monitor.model";
import { Order } from "@/modules/order/order.model";
import { Invoice } from "@/modules/payment/invoice.model";
import { Feedback } from "@/modules/feedback/feedback.model";

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

export function defineAbilityFor(role: string, user?: any): AppAbility {
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

      const productEntities = [
        Product, Case, Mouse, PC, Drive, RAM, Headset,
        Laptop, NetworkCard, GPU, Keyboard, CPU, Motherboard, Cooler, PSU, Monitor,
      ] as const;

      productEntities.forEach((entity) => {
        can("manage", entity as any);
      });

      can("read", Order);
      can("read", Invoice);
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

      can("read",   Order);
      can("update", Order);
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
      can("create", Order);
      can("cancel", Order, { customerId: user?.id } as any);
      
      can("update", Feedback, { accountId: user?.id } as any);
      can("delete", Feedback, { accountId: user?.id } as any);
      can("read",   Order,    { customerId: user?.id } as any);
      
      can("read",   Account,  { id: user?.id } as any);
      can("update", Account,  { id: user?.id } as any);
      can("delete", Account,  { id: user?.id } as any);
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

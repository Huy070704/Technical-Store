import bcrypt from "bcrypt";
import { Role } from "@/modules/auth/entities/role.entity";
import { Account } from "@/modules/auth/entities/account.entity";
import { Category } from "@/modules/product/category.entity";
import { loadSeedJson } from "./loadSeedFile";

const SALT_ROUNDS = 8;

export type RoleSeed = { name: string; slug: string };
export type CategorySeed = { name: string; slug: string };
export type AccountSeed = {
  username: string;
  password: string;
  roleSlug: string;
  name: string;
  phone: string;
  shipper?: {
    maxOrdersPerDay?: number;
    isAvailable?: boolean;
    priority?: number;
  };
};

function resolveAccountPassword(acc: AccountSeed): string {
  if (acc.roleSlug === "admin" && process.env.SEED_ADMIN_PASSWORD) {
    return process.env.SEED_ADMIN_PASSWORD;
  }
  if (acc.roleSlug === "customer" && acc.username === "customer@g4store.com") {
    return process.env.SEED_CUSTOMER_PASSWORD || acc.password;
  }
  return process.env.SEED_DEFAULT_PASSWORD || acc.password;
}

export async function seedRolesFromFile(): Promise<Map<string, Role>> {
  const rows = loadSeedJson<RoleSeed[]>("roles.json");
  const map = new Map<string, Role>();

  for (const row of rows) {
    const role = new Role();
    role.name = row.name;
    role.slug = row.slug;
    await role.save();
    map.set(row.slug, role);
    console.log(`  + Role: ${row.name}`);
  }

  return map;
}

export async function seedCategoriesFromFile(): Promise<void> {
  const rows = loadSeedJson<CategorySeed[]>("categories.json");

  for (const row of rows) {
    const category = new Category();
    category.name = row.name;
    category.slug = row.slug;
    await category.save();
    console.log(`  + Category: ${row.name} (${row.slug})`);
  }
}

export async function seedAccountsFromFile(
  roleMap: Map<string, Role>
): Promise<AccountSeed[]> {
  const rows = loadSeedJson<AccountSeed[]>("accounts.json");

  for (const row of rows) {
    const role = roleMap.get(row.roleSlug);
    if (!role) {
      throw new Error(`Role không tồn tại: ${row.roleSlug}`);
    }

    const password = resolveAccountPassword(row);
    const account = new Account();
    account.email = row.username.trim().toLowerCase();
    account.password = await bcrypt.hash(password, SALT_ROUNDS);
    account.name = row.name;
    account.phone = row.phone;
    account.role = role;
    account.isRegistered = true;

    if (row.roleSlug === "shipper" && row.shipper) {
      account.maxOrdersPerDay = row.shipper.maxOrdersPerDay ?? 20;
      account.isAvailable = row.shipper.isAvailable ?? true;
      account.priority = row.shipper.priority ?? 1;
    }

    await account.save();
    console.log(`  + Account [${row.roleSlug}]: ${row.username}`);
  }

  return rows.map((row) => ({
    ...row,
    password: resolveAccountPassword(row),
  }));
}

export function printAccountsSummary(accounts: AccountSeed[]): void {
  console.log("\n📋 Tài khoản demo:");
  console.log("─".repeat(60));
  for (const acc of accounts) {
    console.log(`  ${acc.roleSlug.padEnd(10)} ${acc.username} / ${acc.password}`);
  }
  console.log("─".repeat(60));
}

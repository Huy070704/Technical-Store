import bcrypt from "bcrypt";
import { Role, RoleDocument } from "../../modules/auth/models/role.model";
import { Account } from "../../modules/auth/models/account.model";
import { Category } from "../../modules/product/models/category.model";
import { Facility } from "../../modules/facility/models/facility.model";
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
  facilitySlug?: string | null;
};

export type FacilitySeed = {
  name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
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

export async function seedRolesFromFile(): Promise<Map<string, RoleDocument>> {
  const rows = loadSeedJson<RoleSeed[]>("roles.json");
  const map = new Map<string, RoleDocument>();

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

export async function seedFacilitiesFromFile(): Promise<Map<string, typeof Facility.prototype>> {
  const rows = loadSeedJson<FacilitySeed[]>("facilities.json");
  const map = new Map<string, typeof Facility.prototype>();

  for (const row of rows) {
    const facility = new Facility();
    facility.name = row.name;
    facility.slug = row.slug;
    facility.address = row.address;
    facility.phone = row.phone;
    facility.email = row.email;
    facility.isActive = row.isActive;
    if (row.latitude != null) facility.latitude = row.latitude;
    if (row.longitude != null) facility.longitude = row.longitude;
    await facility.save();
    map.set(row.slug, facility);
    console.log(`  + Facility: ${row.name} (${row.slug})`);
  }

  return map;
}

export async function seedAccountsFromFile(
  roleMap: Map<string, RoleDocument>,
  facilityMap?: Map<string, typeof Facility.prototype>
): Promise<AccountSeed[]> {
  const rows = loadSeedJson<AccountSeed[]>("accounts.json");

  // Chống trùng ngay tại nguồn để báo lỗi rõ ràng thay vì E11000 khó hiểu.
  // (email và username đều có partial unique index — active only).
  const seenEmails = new Set<string>();
  const seenUsernames = new Set<string>();

  for (const row of rows) {
    const role = roleMap.get(row.roleSlug);
    if (!role) {
      throw new Error(`Role không tồn tại: ${row.roleSlug}`);
    }

    // Trong accounts.json, field `username` chứa EMAIL đăng nhập.
    // Tên đăng nhập (username) suy ra từ local-part của email, lowercase — khớp với login.
    const email = row.username.trim().toLowerCase();
    const loginUsername = email.split("@")[0];

    if (seenEmails.has(email)) {
      throw new Error(`Email trùng lặp trong accounts.json: "${email}"`);
    }
    if (seenUsernames.has(loginUsername)) {
      throw new Error(
        `Username trùng lặp: "${loginUsername}" (từ ${email}). ` +
          `Local-part của email phải là duy nhất vì username suy ra từ đó.`
      );
    }
    seenEmails.add(email);
    seenUsernames.add(loginUsername);

    const password = resolveAccountPassword(row);
    const account = new Account();
    account.email = email;
    account.username = loginUsername;
    account.password = await bcrypt.hash(password, SALT_ROUNDS);
    account.name = row.name;
    account.phone = row.phone;
    account.address = "Hà Nội, Việt Nam";
    account.role = role;
    account.isRegistered = true;

    if (row.facilitySlug && facilityMap) {
      const facility = facilityMap.get(row.facilitySlug);
      if (facility) {
        account.facility = facility._id;
      }
    }

    await account.save();

    // Gán manager vào facility
    if (row.roleSlug === "manager" && row.facilitySlug && facilityMap) {
      const facility = facilityMap.get(row.facilitySlug);
      if (facility) {
        await Facility.findByIdAndUpdate(facility._id, { manager: account._id });
      }
    }

    const facilityInfo = row.facilitySlug ? ` → ${row.facilitySlug}` : "";
    console.log(`  + Account [${row.roleSlug}]: ${row.username}${facilityInfo}`);
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
    const loginUsername = acc.username.trim().toLowerCase().split("@")[0];
    console.log(
      `  ${acc.roleSlug.padEnd(10)} email=${acc.username}  username=${loginUsername}  pass=${acc.password}`
    );
  }
  console.log("  (Đăng nhập được bằng email HOẶC username ở trên)");
  console.log("─".repeat(60));
}

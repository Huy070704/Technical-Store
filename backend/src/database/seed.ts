/**
 * Seed: roles, categories, accounts (không chạy products-script / RFQ)
 *
 * npm run seed
 * npm run seed:accounts  — bỏ categories
 */
import "reflect-metadata";
import "dotenv/config";
import { DbConnection } from "./dbConnection";
import { resetDatabase } from "./seed-data/resetDatabase";
import {
  printAccountsSummary,
  seedAccountsFromFile,
  seedCategoriesFromFile,
  seedRolesFromFile,
} from "./seed-data/seedFromData";

const accountsOnly =
  process.argv.includes("--accounts-only") ||
  process.env.SEED_ACCOUNTS_ONLY === "true";
const skipReset = process.env.SEED_NO_RESET === "true";

async function runSeed(): Promise<void> {
  console.log("🌱 Seed Technical Store");
  console.log("   Nguồn: src/database/seed-data/\n");

  const ds = await DbConnection.createConnection();
  if (!ds?.isInitialized) {
    throw new Error(
      "Không kết nối được database. Kiểm tra .env (DB_* hoặc DATABASE_URL)."
    );
  }

  if (!skipReset) {
    console.log("🗑️  Reset database...");
    await resetDatabase(ds);
  }

  console.log("\n📋 Roles");
  const roleMap = await seedRolesFromFile();

  if (!accountsOnly) {
    console.log("\n📂 Categories");
    await seedCategoriesFromFile();
  }

  console.log("\n👤 Accounts");
  const accounts = await seedAccountsFromFile(roleMap);

  console.log("\n✅ Seed hoàn tất (products: dùng dữ liệu có sẵn hoặc import riêng).");
  printAccountsSummary(accounts);

  await DbConnection.appDataSource.destroy();
}

runSeed().catch((err) => {
  console.error("❌ Seed thất bại:", err);
  process.exit(1);
});

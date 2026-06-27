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

// Import all models to ensure Mongoose registers their schemas and compiles indexes (e.g. Wishlist, Order, etc.)
import "../modules/auth/models/role.model";
import "../modules/auth/models/account.model";
import "../modules/auth/models/refreshToken.model";
import "../modules/otp/models/otp.model";
import "../modules/facility/models/facility.model";
import "../modules/product/models/category.model";
import "../modules/product/models/product.model";
import "../modules/cart/models/cart.model";
import "../modules/cart/models/cartItem.model";
import "../modules/order/models/order.model";
import "../modules/order/models/orderDetail.model";
import "../modules/payment/models/payment.model";
import "../modules/payment/models/invoice.model";
import "../modules/feedback/models/feedback.model";
import "../modules/wishlist/models/wishlist.model";
import {
  printAccountsSummary,
  seedAccountsFromFile,
  seedCategoriesFromFile,
  seedRolesFromFile,
  seedFacilitiesFromFile,
} from "./seed-data/seedFromData";
import { runProductSeedPipeline } from "./seed-data/products-script";

const accountsOnly =
  process.argv.includes("--accounts-only") ||
  process.env.SEED_ACCOUNTS_ONLY === "true";
const skipReset = process.env.SEED_NO_RESET === "true";

async function runSeed(): Promise<void> {
  console.log("🌱 Seed Technical Store");
  console.log("   Nguồn: src/database/seed-data/\n");

  const ds = await DbConnection.createConnection();
  if (ds?.readyState !== 1) {
    throw new Error(
      "Không kết nối được database. Kiểm tra .env (DB_* hoặc DATABASE_URL).",
    );
  }

  if (!skipReset) {
    console.log("🗑️  Reset database...");
    await resetDatabase(ds);
  }

  console.log("\n📋 Roles");
  const roleMap = await seedRolesFromFile();

  let facilityMap: Map<string, any> | undefined;

  if (!accountsOnly) {
    console.log("\n📂 Categories");
    await seedCategoriesFromFile();

    console.log("\n🏢 Facilities");
    facilityMap = await seedFacilitiesFromFile();
  }

  console.log("\n👤 Accounts");
  const accounts = await seedAccountsFromFile(roleMap, facilityMap);

  if (!accountsOnly) {
    console.log("\n📦 Products & Product Components");
    await runProductSeedPipeline();
  }

  console.log("\n✅ Seed hoàn tất.");
  printAccountsSummary(accounts);

  await DbConnection.closeConnection();
}

runSeed().catch((err) => {
  console.error("❌ Seed thất bại:", err);
  process.exit(1);
});

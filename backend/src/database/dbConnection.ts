import { DataSource } from "typeorm";
import config from "./ormconfig";

/** Migrate schema cũ (phone/username) → schema mới trước khi TypeORM sync */
async function prepareLegacySchema(dataSource: DataSource): Promise<void> {
  const runner = dataSource.createQueryRunner();
  await runner.connect();

  try {
    const accountTable = await runner.getTable("accounts");
    if (accountTable) {
      const accountCols = accountTable.columns.map((c) => c.name);

      if (accountCols.includes("username") && !accountCols.includes("email")) {
        await runner.query(
          `ALTER TABLE "accounts" RENAME COLUMN "username" TO "email"`
        );
        console.log("✅ Migrated accounts.username → accounts.email");
      } else if (accountCols.includes("email")) {
        await runner.query(`
          UPDATE "accounts"
          SET "email" = COALESCE(NULLIF("email", ''), 'legacy_' || "id"::text || '@sense.local')
          WHERE "email" IS NULL OR "email" = ''
        `);
      }
    }
  } catch (err) {
    console.warn(
      "⚠️ Legacy schema prep skipped:",
      err instanceof Error ? err.message : err
    );
  } finally {
    await runner.release();
  }
}

export class DbConnection {
  static appDataSource: DataSource;

  public static async getConnection() {
    if (this.appDataSource?.isInitialized) return this.appDataSource;
    return null;
  }

  public static async createConnection() {
    const bootstrap = new DataSource({ ...config, synchronize: false });
    try {
      await bootstrap.initialize();
      await prepareLegacySchema(bootstrap);
      await bootstrap.destroy();
    } catch (err) {
      console.warn(
        "⚠️ Legacy schema prep:",
        err instanceof Error ? err.message : err
      );
    }

    try {
      this.appDataSource = new DataSource(config);
      await this.appDataSource.initialize();
      await this.appDataSource.query("SET timezone = '+07:00'");
      return this.appDataSource;
    } catch (err) {
      this.appDataSource = undefined as unknown as DataSource;
      const message = err instanceof Error ? err.message : String(err);

      if (
        message.includes("email") ||
        message.includes('"code"') ||
        message.includes("otps") ||
        message.includes("accounts")
      ) {
        console.warn("⚠️ Retrying after clearing conflicting auth tables...");
        try {
          const retryBootstrap = new DataSource({ ...config, synchronize: false });
          await retryBootstrap.initialize();
          await retryBootstrap.query(`DROP TABLE IF EXISTS "otps" CASCADE`);
          await retryBootstrap.query(`
            UPDATE "accounts"
            SET "email" = COALESCE(NULLIF("email", ''), 'legacy_' || "id"::text || '@sense.local')
            WHERE "email" IS NULL OR "email" = ''
          `);
          await retryBootstrap.destroy();

          this.appDataSource = new DataSource(config);
          await this.appDataSource.initialize();
          await this.appDataSource.query("SET timezone = '+07:00'");
          console.log("✅ Database connected after auth schema reset");
          return this.appDataSource;
        } catch (retryErr) {
          console.error("❌ Retry failed:", retryErr);
        }
      }

      console.error("❌ Database connection failed:", message);
      if (message.includes("ENOTFOUND") && process.env.DATABASE_URL) {
        console.error(
          "   Host trong DATABASE_URL không phân giải được. Lấy connection string mới từ Neon Console hoặc tắt DATABASE_URL để dùng Postgres local (DB_HOST=localhost)."
        );
      }
      throw err;
    }
  }
}

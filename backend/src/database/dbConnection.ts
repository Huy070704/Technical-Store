import { DataSource } from "typeorm";
import config from "./ormconfig";

export class DbConnection {
  static appDataSource: DataSource;

  public static async getConnection() {
    if (this.appDataSource) return this.appDataSource;
    return null;
  }

  public static async createConnection() {
    try {
      this.appDataSource = new DataSource(config);
      await this.appDataSource.initialize();
      await this.appDataSource.query("SET timezone = '+07:00'");
      return this.appDataSource;
    } catch (err) {
      this.appDataSource = undefined as unknown as DataSource;
      const message =
        err instanceof Error ? err.message : String(err);
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

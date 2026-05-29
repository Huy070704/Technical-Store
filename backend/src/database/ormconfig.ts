import path from "path";
import "dotenv/config";
import { DataSourceOptions } from "typeorm";

const useSsl =
  process.env.DB_SSL === "true" ||
  (process.env.DATABASE_URL?.includes("neon.tech") ?? false);

const username =
  process.env.DB_USER || process.env.DB_USERNAME || "postgres";

const baseConfig = {
  type: "postgres" as const,
  synchronize: process.env.DB_SYNCHRONIZE !== "false",
  extra: {
    timezone: "+07:00",
  },
  entities: [path.join(__dirname, "../*/**/*.entity.{ts,js}")],
  ssl: useSsl ? { rejectUnauthorized: false } : false,
};

// Neon: dùng DATABASE_URL (connection string từ dashboard Neon)
if (process.env.DATABASE_URL) {
  Object.assign(baseConfig, {
    url: process.env.DATABASE_URL,
  });
} else {
  Object.assign(baseConfig, {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    username,
    password: process.env.DB_PASSWORD || "Admin123",
    database: process.env.DB_NAME || "TechnicalStore",
  });
}

export default baseConfig as DataSourceOptions;

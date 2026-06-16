// Cấu hình kết nối MongoDB.
import "dotenv/config";

/**
 * Dựng MongoDB connection URI từ biến môi trường.
 *  - Ưu tiên MONGO_URI / MONGODB_URI / DATABASE_URL (connection string đầy đủ, vd Atlas).
 *  - Nếu không có, ghép từ host/port/db (Mongo local).
 */
export function getMongoUri(): string {
  const direct =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL;
  if (direct) return direct;

  const host = process.env.MONGO_HOST || process.env.DB_HOST || "localhost";
  const port = process.env.MONGO_PORT || process.env.DB_PORT || "27017";
  const dbName = process.env.MONGO_DB || process.env.DB_NAME || "TechnicalStore";

  return `mongodb://${host}:${port}/${dbName}`;
}

export default getMongoUri;

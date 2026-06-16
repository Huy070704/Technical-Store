import mongoose, { Connection } from "mongoose";
import { getMongoUri } from "./ormconfig";

/**
 * Quản lý kết nối MongoDB qua Mongoose — thay thế DataSource của TypeORM.
 */
export class DbConnection {
  static connection: Connection;

  /** Trả về kết nối hiện tại nếu đã mở, ngược lại null. */
  public static async getConnection(): Promise<Connection | null> {
    if (this.connection?.readyState === 1) return this.connection;
    return null;
  }

  /** Khởi tạo kết nối tới MongoDB. */
  public static async createConnection(): Promise<Connection> {
    if (this.connection?.readyState === 1) return this.connection;

    const uri = getMongoUri();

    // strictQuery=false giữ hành vi lọc linh hoạt giống TypeORM
    mongoose.set("strictQuery", false);

    try {
      await mongoose.connect(uri, {
        autoIndex: true, // tự tạo index khai báo trong schema (tương đương @Index)
        serverSelectionTimeoutMS: 10000,
      });
      this.connection = mongoose.connection;
      console.log("✅ MongoDB connected:", this.connection.name);
      return this.connection;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("❌ MongoDB connection failed:", message);
      if (message.includes("ECONNREFUSED")) {
        console.error(
          "   Không kết nối được MongoDB. Kiểm tra MONGO_URI / mongod đang chạy (mặc định mongodb://localhost:27017)."
        );
      }
      throw err;
    }
  }

  /** Đóng kết nối (dùng cho seed/drop scripts). */
  public static async closeConnection(): Promise<void> {
    if (this.connection) {
      await mongoose.disconnect();
      this.connection = undefined as unknown as Connection;
    }
  }
}

import mongoose, { Connection } from "mongoose";
import { getMongoUri } from "./mongoConfig";

/**
 * Quản lý kết nối MongoDB qua Mongoose.
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

    // strictQuery=false: không loại bỏ các field không khai báo trong schema khỏi filter
    mongoose.set("strictQuery", false);

    try {
      await mongoose.connect(uri, {
        // Chỉ tự đồng bộ index khi bật SYNC_INDEXES=true (mỗi model 1 round-trip tới Atlas,
        // rất chậm khi khởi động dev). Bật khi schema/index đổi, còn lại nên tắt.
        autoIndex: process.env.SYNC_INDEXES === "true",
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

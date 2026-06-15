import "reflect-metadata";
import "dotenv/config";
import { DbConnection } from "./dbConnection";

async function dropSchema() {
  console.log("Dropping database schema...");
  try {
    const ds = await DbConnection.createConnection();
    if (ds && ds.isInitialized) {
      await ds.dropDatabase();
      console.log("✅ Toàn bộ schema và bảng đã được xóa sạch.");
      await ds.destroy();
    } else {
      console.error("❌ Không thể khởi tạo database connection.");
    }
  } catch (error) {
    console.error("❌ Lỗi khi drop schema:", error);
  }
}

dropSchema();

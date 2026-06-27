import "reflect-metadata";
import "dotenv/config";
import { DbConnection } from "./dbConnection";

async function dropSchema() {
  console.log("Dropping database schema...");
  try {
    const conn = await DbConnection.createConnection();
    if (conn && conn.readyState === 1) {
      await conn.dropDatabase();
      console.log("✅ Toàn bộ schema và bảng đã được xóa sạch.");
      await DbConnection.closeConnection();
    } else {
      console.error("❌ Không thể khởi tạo database connection.");
    }
  } catch (error) {
    console.error("❌ Lỗi khi drop schema:", error);
  }
}

dropSchema();

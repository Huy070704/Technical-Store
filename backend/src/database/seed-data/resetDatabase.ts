import { Connection } from "mongoose";

export async function resetDatabase(connection: Connection): Promise<void> {
  const collections = await connection.db!.collections();
  if (collections.length === 0) {
    console.warn("  ! Không có collection nào để drop.");
    return;
  }

  for (const collection of collections) {
    await collection.drop();
  }
  console.log(`   Đã xóa dữ liệu ${collections.length} collection.`);
}

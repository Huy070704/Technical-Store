import { DataSource } from "typeorm";

export async function resetDatabase(dataSource: DataSource): Promise<void> {
  const tableNames = [
    ...new Set(dataSource.entityMetadatas.map((m) => m.tableName)),
  ].filter(Boolean);

  if (tableNames.length === 0) {
    console.warn("  ! Không có bảng nào để truncate.");
    return;
  }

  const quoted = tableNames.map((t) => `"${t}"`).join(", ");
  await dataSource.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
  console.log(`   Đã xóa dữ liệu ${tableNames.length} bảng.`);
}

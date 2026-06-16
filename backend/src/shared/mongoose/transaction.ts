import mongoose, { ClientSession } from "mongoose";

/**
 * Chạy một khối tác vụ trong transaction MongoDB (thay cho
 * DataSource.manager.transaction của TypeORM).
 *
 * MongoDB chỉ hỗ trợ transaction trên replica set / mongos. Nếu cụm hiện tại là
 * standalone (thường gặp khi dev local), ta tự động fallback chạy không session
 * để giữ nguyên luồng nghiệp vụ (mất tính atomic, nhưng hành vi vẫn đúng).
 */
export async function runInTransaction<T>(
  fn: (session?: ClientSession) => Promise<T>
): Promise<T> {
  let session: ClientSession;
  try {
    session = await mongoose.startSession();
  } catch {
    // Không tạo được session → chạy trực tiếp
    return fn(undefined);
  }

  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result!;
  } catch (err) {
    if (isTransactionUnsupported(err)) {
      // Standalone không hỗ trợ transaction → chạy lại không session.
      // An toàn vì startTransaction thất bại trước khi fn chạy.
      return fn(undefined);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

function isTransactionUnsupported(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: number })?.code;
  return (
    code === 20 ||
    /Transaction numbers are only allowed/i.test(msg) ||
    /replica set|mongos|transactions? .*not support|standalone/i.test(msg)
  );
}

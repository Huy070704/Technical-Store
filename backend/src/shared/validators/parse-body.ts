import { z } from "zod";
import { BadRequestException } from "@/shared/exceptions/http-exceptions";

/**
 * Validate + parse request body bằng Zod schema.
 * Throw BadRequestException nếu body không hợp lệ.
 */
export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = result.error.issues.map((i) => i.message).join("; ");
    throw new BadRequestException(msg);
  }
  return result.data;
}

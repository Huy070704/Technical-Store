import { InterceptorInterface, Interceptor, Action } from "routing-controllers";
import { instanceToPlain } from "class-transformer";
import { Service } from "typedi";
import { Document } from "mongoose";

/**
 * Chuẩn hoá kết quả trả về thành object thuần.
 * Mongoose Document có toJSON (đã cấu hình transform expose `id`, ẩn password/_id/__v),
 * nên cần serialize đệ quy các Document lồng nhau.
 */
function serialize(value: any): any {
  if (value === null || value === undefined) return value;
  if (value instanceof Document) return value.toJSON();
  if (Array.isArray(value)) return value.map(serialize);
  if (value instanceof Date) return value;
  if (typeof value === "object" && (value.constructor === Object || value.constructor === undefined)) {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      out[key] = serialize(value[key]);
    }
    return out;
  }
  return value;
}

@Service()
@Interceptor()
export class ResponseInterceptor implements InterceptorInterface {
  intercept(action: Action, result: unknown): unknown {
    if (action.response?.headersSent) {
      return undefined;
    }

    if (result === undefined || result === null) {
      return result;
    }

    if (
      typeof result === "object" &&
      result !== null &&
      "setHeader" in result &&
      typeof (result as { setHeader?: unknown }).setHeader === "function"
    ) {
      return result;
    }

    const statusCode = action.response?.statusCode ?? 200;
    return {
      success: true,
      statusCode,
      data: instanceToPlain(serialize(result)),
    };
  }
}

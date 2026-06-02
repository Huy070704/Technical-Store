import { InterceptorInterface, Interceptor, Action } from "routing-controllers";
import { instanceToPlain } from "class-transformer";
import { Service } from "typedi";

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
      data: instanceToPlain(result),
    };
  }
}
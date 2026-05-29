import { InterceptorInterface, Interceptor, Action } from "routing-controllers";
import { instanceToPlain } from "class-transformer";
import { Service } from "typedi";

@Service()
@Interceptor()
export class ResponseInterceptor implements InterceptorInterface {
  intercept(action: Action, result: any): any {
    const statusCode = action.response?.statusCode ?? 200;
    return {
      success: true,
      statusCode: 200,
      data: instanceToPlain(result),
    };
  }
}
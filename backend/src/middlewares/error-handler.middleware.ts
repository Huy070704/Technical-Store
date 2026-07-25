import { HttpMessages } from "@/shared/exceptions/http-messages.constant";
import { BaseException } from "@/shared/exceptions/http-exceptions";
import { instanceToPlain } from "class-transformer";
import { JsonWebTokenError } from "jsonwebtoken";
import {
  Middleware,
  ExpressErrorMiddlewareInterface,
} from "routing-controllers";
import { Service } from "typedi";
import { HttpError } from "routing-controllers";

@Service()
@Middleware({ type: "after" })
export class ErrorHandler implements ExpressErrorMiddlewareInterface {
  error(error: any, req: any, res: any, next: (err?: any) => any): void {
    if (res.headersSent) return next(error);
    console.log("");
    console.log("🔴 ERROR HANDLER TRIGGERED");
    console.log("Error object:", error);
    console.log("Error message:", error.message);

    let status: number = error.httpCode || error.status || 500;
    let message: string | string[] = error.message || "Đã có lỗi xảy ra, vui lòng thử lại sau";

    // Handle custom BaseException (ValidationException, ForbiddenException)
    // — trả userMessage tiếng Việt thay vì message kỹ thuật tiếng Anh
    if (error instanceof BaseException) {
      status = error.status;
      message = error.userMessage || error.message;
    }

    // Handle Mongoose CastError (e.g. invalid ObjectId format)
    if (error.name === "CastError") {
      status = 400;
      message = `Định dạng mã ID (${error.value}) không hợp lệ cho trường ${error.path}`;
    }

    // Handle routing-controllers HttpError instances
    if (error instanceof HttpError) {
      status = error.httpCode;
      message = error.message || "Không tìm thấy tài nguyên";
    }

    if (error instanceof JsonWebTokenError) {
      status = 401;
      message = HttpMessages._UNAUTHORIZED;
    }

    const parsed = instanceToPlain(error);
    const validatorErrors = [];

    if (parsed.errors?.length > 0) {
      for (const i of parsed.errors) {
        const keys = Object.keys(i.constraints || {});
        if (keys.length > 0) {
          validatorErrors.push(i.constraints[keys[0]]);
        }
      }
      message = [...validatorErrors];
    }

    const response = {
      success: false,
      statusCode: status,
      message: Array.isArray(message) ? message[0] : message,
    };

    res.status(status).json(response);
  }
}

import { HttpError } from "routing-controllers";
import { HttpMessages } from "./http-messages.constant";

export class HttpException extends HttpError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    this.message = message;
  }
  toJSON() {
    return {
      status: this.httpCode || 500,
      message: this.message,
      name: this.name,
    };
  }
}

export class EntityNotFoundException extends HttpException {
  constructor(entityName = "Resource") {
    super(404, `${entityName} not found`);
  }
}

export class AccountNotFoundException extends HttpException {
  constructor() {
    console.log(
      "Throwing AccountNotFoundException with message:",
      HttpMessages._WRONG_CREDENTIALS
    );
    super(401, HttpMessages._WRONG_CREDENTIALS);
  }
}

export class WrongOldPasswordException extends HttpException {
  constructor() {
    console.log(
      "Throwing WrongOldPasswordException with message:",
      HttpMessages._WRONG_OLD_PASSWORD
    );
    super(400, HttpMessages._WRONG_OLD_PASSWORD);
  }
}

export class TokenNotFoundException extends HttpException {
  constructor() {
    console.log(
      "Throwing TokenNotFoundException with message:",
      HttpMessages._NO_TOKEN
    );
    super(400, HttpMessages._NO_TOKEN);
  }
}


export class NoFileUploadedException extends HttpException {
  constructor() {
    super(400, "No file uploaded");
  }
}

export class BadRequestException extends HttpException {
  constructor(message: string) {
    super(400, message);
  }
}

export class UsernameAlreadyExistedException extends HttpException {
  constructor(message: string) {
    super(400, message);
  }
}

export class PhoneAlreadyExistedException extends HttpException {
  constructor(message: string) {
    super(400, message);
  }
}

export class BaseException extends Error {
  public status: number;
  public code: string;
  public userMessage: string;

  constructor(message: string, status: number = 500, code: string = 'INTERNAL_ERROR', userMessage?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.userMessage = userMessage || message;
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        userMessage: this.userMessage,
        status: this.status
      },
      message: this.userMessage
    };
  }
}

export class ValidationException extends BaseException {
  constructor(message: string, userMessage?: string) {
    super(message, 400, 'VALIDATION_ERROR', userMessage || 'Dữ liệu không hợp lệ');
  }
}

export class ForbiddenException extends BaseException {
  constructor(message: string, userMessage?: string) {
    super(message, 403, 'FORBIDDEN_ERROR', userMessage || 'You do not have permission to perform this action.');
  }
}

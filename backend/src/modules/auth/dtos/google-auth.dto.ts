import { IsString } from "class-validator";

export class GoogleUserDto {
  email: string;
  name: string;
  avatar?: string;
  googleId: string;
}

export class ExchangeOAuthCodeDto {
  @IsString({ message: "Code phải là chuỗi ký tự" })
  code: string;
}

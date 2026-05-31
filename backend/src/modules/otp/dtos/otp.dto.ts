import { IsEmail, IsString, Length } from "class-validator";

export class OtpSendDto {
  @IsEmail({}, { message: "Email không hợp lệ" })
  email: string;
}

export class OtpVerifyDto {
  @IsEmail({}, { message: "Email không hợp lệ" })
  email: string;

  @IsString()
  @Length(6, 6, { message: "Mã OTP phải có đúng 6 chữ số" })
  otp: string;
}

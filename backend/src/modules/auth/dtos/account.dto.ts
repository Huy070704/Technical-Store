import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from "class-validator";
import { Role } from "../entities/role.entity";

export class CredentialsDto {
  @IsEmail({}, { message: "Email không hợp lệ" })
  email: string;

  @IsString()
  @MinLength(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" })
  password: string;
}

/** Alias rõ nghĩa cho POST /account/login */
export class LoginDto extends CredentialsDto {}

export class ForgotPasswordEmailDto {
  @IsEmail({}, { message: "Email không hợp lệ" })
  email: string;
}

export class ResendOtpDto {
  @IsEmail({}, { message: "Email không hợp lệ" })
  email: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(6, { message: "Mật khẩu cũ phải có ít nhất 6 ký tự" })
  oldPassword: string;
}

export class VerifyChangePasswordDto {
  @IsEmail({}, { message: "Email không hợp lệ" })
  email: string;

  @IsString()
  @Length(6, 6, { message: "Mã OTP phải có đúng 6 chữ số" })
  otp: string;

  @IsString()
  @MinLength(6, { message: "Mật khẩu mới phải có ít nhất 6 ký tự" })
  @Matches(/\d/, { message: "Mật khẩu mới phải có ít nhất một chữ số" })
  newPassword: string;
}

export class RegisterDto {
  @IsEmail({}, { message: "Email không hợp lệ" })
  email: string;

  @IsString()
  @MinLength(8, { message: "Mật khẩu phải có ít nhất 8 ký tự" })
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsNotEmpty({ message: "Họ tên không được để trống" })
  @Length(2, 100, { message: "Họ tên phải từ 2–100 ký tự" })
  name: string;
}

export class CreateAccountDto {
  @IsEmail({}, { message: "Email không hợp lệ" })
  email: string;

  @IsString()
  @MinLength(6, { message: "Mật khẩu phải có ít nhất 6 ký tự" })
  password: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  name: string;

  @IsString()
  roleSlug: string;
}

export class AccountDetailsDto {
  @IsString()
  accountId: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsObject()
  role: Role;
}

export class VerifyRegisterDto {
  @IsEmail({}, { message: "Email không hợp lệ" })
  email: string;

  @IsString()
  @Length(6, 6, { message: "Mã OTP phải có đúng 6 chữ số" })
  otp: string;
}

export class UpdateAccountDto {
  @IsEmail({}, { message: "Email không hợp lệ" })
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  roleSlug?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isBlocked?: boolean;
}

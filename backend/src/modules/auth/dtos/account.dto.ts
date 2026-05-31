import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
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

export class RegisterDto {
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
}

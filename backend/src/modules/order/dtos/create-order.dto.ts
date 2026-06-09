import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { VN_PHONE_REGEX } from "@/shared/validators/vietnam-phone";

export enum PaymentMethodType {
  COD = "COD",
  ONLINE = "ONLINE",
}

export class GuestInfoDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  fullName: string;

  @Transform(({ value }) => String(value ?? "").replace(/\D/g, ""))
  @IsString()
  @IsNotEmpty()
  @Matches(VN_PHONE_REGEX, {
    message: "Số điện thoại Việt Nam không hợp lệ",
  })
  phone: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class GuestCartItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  @Max(99)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsNotEmpty()
  @Length(1, 255)
  name: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @Length(10, 500)
  shippingAddress: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  note?: string;

  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;

  @IsBoolean()
  @IsOptional()
  requireInvoice?: boolean = false;

  @IsBoolean()
  @IsOptional()
  isGuest?: boolean = false;

  @ValidateNested()
  @Type(() => GuestInfoDto)
  @IsOptional()
  guestInfo?: GuestInfoDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestCartItemDto)
  @IsOptional()
  guestCartItems?: GuestCartItemDto[];

  /** Chỉ dùng cho user đã đăng nhập — checkout một phần giỏ */
  @IsArray()
  @IsUUID("4", { each: true })
  @IsOptional()
  selectedProductIds?: string[];

  /** Bắt buộc khi isGuest — OTP đã gửi tới guestInfo.email */
  @ValidateIf((o) => o.isGuest === true)
  @IsString()
  @IsNotEmpty({ message: "Mã OTP khách hàng là bắt buộc" })
  @Length(6, 6, { message: "Mã OTP phải có đúng 6 chữ số" })
  guestOtp?: string;
}

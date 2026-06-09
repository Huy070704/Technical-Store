import { IsEmail, IsOptional, IsString } from "class-validator";

export class CreatePayosLinkGuestDto {
  @IsEmail()
  @IsOptional()
  email?: string;
}

export class PaymentStatusDto {
  orderId: string;
  status: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

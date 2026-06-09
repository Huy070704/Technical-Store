import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  ValidateIf,
} from "class-validator";
import { OrderStatus } from "../order.entity";

export class UpdateOrderDto {
  @IsEnum(OrderStatus, { message: "Trạng thái đơn hàng không hợp lệ" })
  @IsNotEmpty()
  status: OrderStatus;

  @ValidateIf((o) => o.status === OrderStatus.CANCELLED)
  @IsString()
  @IsNotEmpty()
  @Length(10, 200, { message: "Lý do hủy phải từ 10-200 ký tự" })
  cancelReason?: string;
}

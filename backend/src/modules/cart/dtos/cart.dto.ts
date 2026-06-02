import { IsInt, IsNotEmpty, IsString, IsUUID, Max, Min } from "class-validator";
import { MAX_ITEM_QUANTITY } from "../constants/cart.constants";

/** Body POST /api/cart/add */
export class AddToCartDto {
  @IsUUID("4", { message: "Product ID không hợp lệ" })
  productId: string;

  @IsInt({ message: "Số lượng phải là số nguyên" })
  @Min(1, { message: "Số lượng tối thiểu là 1" })
  @Max(MAX_ITEM_QUANTITY, { message: `Số lượng tối đa là ${MAX_ITEM_QUANTITY}` })
  quantity: number;
}

/** Body POST /api/cart/increase | /api/cart/decrease */
export class ChangeCartQuantityDto {
  @IsUUID("4", { message: "Product ID không hợp lệ" })
  productId: string;

  @IsInt({ message: "Số lượng thay đổi phải là số nguyên" })
  @Min(1, { message: "Số lượng thay đổi tối thiểu là 1" })
  @Max(MAX_ITEM_QUANTITY, { message: `Số lượng thay đổi tối đa là ${MAX_ITEM_QUANTITY}` })
  amount: number;
}

/** Body PATCH /api/cart/remove */
export class RemoveCartItemDto {
  @IsUUID("4", { message: "Product ID không hợp lệ" })
  @IsNotEmpty()
  productId: string;
}

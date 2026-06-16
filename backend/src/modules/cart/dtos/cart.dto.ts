import {
  IsArray,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { MAX_ITEM_QUANTITY } from "../constants/cart.constants";

/** Body POST /api/cart/add */
export class AddToCartDto {
  @IsMongoId({ message: "Product ID không hợp lệ" })
  productId: string;

  @IsInt({ message: "Số lượng phải là số nguyên" })
  @Min(1, { message: "Số lượng tối thiểu là 1" })
  @Max(MAX_ITEM_QUANTITY, { message: `Số lượng tối đa là ${MAX_ITEM_QUANTITY}` })
  quantity: number;
}

/** Body POST /api/cart/increase | /api/cart/decrease */
export class ChangeCartQuantityDto {
  @IsMongoId({ message: "Product ID không hợp lệ" })
  productId: string;

  @IsInt({ message: "Số lượng thay đổi phải là số nguyên" })
  @Min(1, { message: "Số lượng thay đổi tối thiểu là 1" })
  @Max(MAX_ITEM_QUANTITY, { message: `Số lượng thay đổi tối đa là ${MAX_ITEM_QUANTITY}` })
  amount: number;
}

/** Body PATCH /api/cart/remove */
export class RemoveCartItemDto {
  @IsMongoId({ message: "Product ID không hợp lệ" })
  @IsNotEmpty()
  productId: string;
}

/** Một dòng giỏ guest khi merge sau đăng nhập */
export class GuestCartLineDto {
  @IsMongoId({ message: "Product ID không hợp lệ" })
  productId: string;

  @IsInt({ message: "Số lượng phải là số nguyên" })
  @Min(1, { message: "Số lượng tối thiểu là 1" })
  @Max(MAX_ITEM_QUANTITY, { message: `Số lượng tối đa là ${MAX_ITEM_QUANTITY}` })
  quantity: number;
}

/** Body POST /api/cart/merge-guest */
export class MergeGuestCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestCartLineDto)
  lines: GuestCartLineDto[];
}

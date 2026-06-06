import { IsString } from "class-validator";

export class AttachImageDto {
  @IsString()
  query: string;

  @IsString()
  imagesURL: string;
}

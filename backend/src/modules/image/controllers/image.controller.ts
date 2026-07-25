import {
  Post,
  UploadedFile,
  Controller,
  Body,
} from "routing-controllers";
import { Service } from "typedi";
import { ImageService } from "../services/image.service";
import { parseBody } from "@/shared/validators/parse-body";
import { z } from "zod";

const attachImageSchema = z.object({
  query: z.string().min(1, "ID không được trống"),
  imagesURL: z.string().min(1, "URL ảnh không được trống"),
});

@Service()
@Controller("/image")
export class ImageController {
  constructor(private readonly imageService: ImageService) { }

  @Post("/upload")
  async upload(@UploadedFile("file") file: Express.Multer.File) {
    return await this.imageService.uploadImage(file);
  }

  @Post("/attach-to-product")
  async attachToProduct(@Body({ validate: false }) body: unknown) {
    const dto = parseBody(attachImageSchema, body);
    await this.imageService.attachImagesToProduct(dto.query, dto.imagesURL);
    return { message: "Success" };
  }

  @Post("/attach-to-feedback")
  async attachToFeedback(@Body({ validate: false }) body: unknown) {
    const dto = parseBody(attachImageSchema, body);
    await this.imageService.attachImagesToFeedback(dto.query, dto.imagesURL);
    return { message: "Success" };
  }
}

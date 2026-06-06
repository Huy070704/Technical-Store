import {
  Post,
  UploadedFile,
  Controller,
  Body,
} from "routing-controllers";
import { Service } from "typedi";
import { ImageService } from "../services/image.service";
import { AttachImageDto } from "../image.dto";

@Service()
@Controller("/image")
export class ImageController {
  constructor(private readonly imageService: ImageService) {}

  @Post("/upload")
  async upload(@UploadedFile("file") file: Express.Multer.File) {
    return await this.imageService.uploadImage(file);
  }

  @Post("/attach-to-product")
  async attachToProduct(@Body() body: AttachImageDto) {
    await this.imageService.attachImagesToProduct(body.query, body.imagesURL);
    return { message: "Success" };
  }

  @Post("/attach-to-feedback")
  async attachToFeedback(@Body() body: AttachImageDto) {
    await this.imageService.attachImagesToFeedback(body.query, body.imagesURL);
    return { message: "Success" };
  }
}

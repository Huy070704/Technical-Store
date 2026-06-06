import {
  EntityNotFoundException,
  NoFileUploadedException,
} from "@/shared/exceptions/http-exceptions";
import { uploadToCloudinary } from "@/utils/cloudinary/cloudinary";
import { Service } from "typedi";
import { Image } from "../image.entity";
import { Product } from "@/modules/product/product.entity";
import { In } from "typeorm";
import { Feedback } from "@/modules/feedback/feedback.entity";

@Service()
export class ImageService {
  async uploadImage(file: Express.Multer.File) {
    if (!file) throw new NoFileUploadedException();
    const url = await uploadToCloudinary(file);
    const newImage = new Image();
    newImage.originalName = file.originalname;
    newImage.name = file.originalname;
    newImage.url = url;
    await newImage.save();
    return newImage;
  }

  async attachImagesToProduct(productId: string, imagesURL: string) {
    const product = await Product.findOne({ where: { id: productId } });
    if (!product) throw new EntityNotFoundException("Product");
    const imageURLs: string[] = imagesURL.split(",");
    const images = await Image.find({ where: { url: In(imageURLs) } });
    product.images = images;
    await product.save();
    return product;
  }

  async attachImagesToFeedback(feedbackId: string, imagesURL: string) {
    const feedback = await Feedback.findOne({ where: { id: feedbackId } });
    if (!feedback) throw new EntityNotFoundException("Feedback");
    const imageURLs: string[] = imagesURL.split(",");
    const images = await Image.find({ where: { url: In(imageURLs) } });
    feedback.images = images;
    await feedback.save();
    return feedback;
  }
}

import {
  EntityNotFoundException,
  NoFileUploadedException,
} from "@/shared/exceptions/http-exceptions";
import { uploadToCloudinary } from "@/utils/cloudinary/cloudinary";
import { Service } from "typedi";
import { Image } from "../image.entity";
import { Product } from "@/modules/product/product.entity";
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
    const product = await Product.findById(productId);
    if (!product) throw new EntityNotFoundException("Product");
    const imageURLs: string[] = imagesURL.split(",");
    // Gán khoá ngoại product cho các ảnh (OneToMany — Image giữ ref)
    await Image.updateMany({ url: { $in: imageURLs } }, { product: product._id });
    return Product.findById(productId).populate("images");
  }

  async attachImagesToFeedback(feedbackId: string, imagesURL: string) {
    const feedback = await Feedback.findById(feedbackId);
    if (!feedback) throw new EntityNotFoundException("Feedback");
    const imageURLs: string[] = imagesURL.split(",");
    await Image.updateMany({ url: { $in: imageURLs } }, { feedback: feedback._id });
    return Feedback.findById(feedbackId).populate("images");
  }
}

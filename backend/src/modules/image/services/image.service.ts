import {
  BadRequestException,
  EntityNotFoundException,
  NoFileUploadedException,
} from "@/shared/exceptions/http-exceptions";
import { uploadToCloudinary } from "@/utils/cloudinary";
import { Service } from "typedi";
import { Image } from "../models/image.model";
import { Product } from "../../product/models/product.model";
import { Feedback } from "../../feedback/models/feedback.model";

@Service()
export class ImageService {
  async uploadImage(file: Express.Multer.File) {
    if (!file) throw new NoFileUploadedException();
    const { url, name } = await uploadToCloudinary(file);
    const newImage = new Image();
    newImage.originalName = file.originalname;
    newImage.name = name;
    newImage.url = url;
    await newImage.save();
    return newImage;
  }

  async attachImagesToProduct(productId: string, imagesURL: string) {
    const product = await Product.findById(productId);
    if (!product) throw new EntityNotFoundException("Product");
    const imageURLs: string[] = Array.from(new Set(
      imagesURL.split(",").map(url => url.trim()).filter(Boolean)
    ));

    // Validate: không cho phép 2 ảnh trùng tên file (originalName) trong cùng 1 sản phẩm
    if (imageURLs.length > 0) {
      const images = await Image.find({ url: { $in: imageURLs } }).select("originalName url");
      const nameMap = new Map<string, string>(); // originalName -> url
      for (const img of images) {
        const normalizedName = (img.originalName ?? "").toLowerCase().trim();
        if (!normalizedName) continue;
        if (nameMap.has(normalizedName)) {
          throw new BadRequestException(
            `Ảnh bị trùng tên file: "${img.originalName}". Vui lòng sử dụng các ảnh có tên file khác nhau.`
          );
        }
        nameMap.set(normalizedName, img.url);
      }

      // Kiểm tra ảnh mới trùng tên với ảnh đang có trong sản phẩm (ảnh giữ lại + ảnh mới upload)
      // — đã cover bởi logic trên vì tất cả URL đều nằm trong imageURLs
    }

    // 1. Gỡ bỏ liên kết của tất cả ảnh cũ thuộc sản phẩm này (set product = null)
    await Image.updateMany({ product: product._id }, { product: null });

    // 2. Gán lại liên kết product cho các ảnh mới/giữ lại
    if (imageURLs.length > 0) {
      await Image.updateMany({ url: { $in: imageURLs } }, { product: product._id });
      
      // 3. Đồng thời cập nhật ảnh chính cho sản phẩm là ảnh đầu tiên
      product.image = imageURLs[0];
      await product.save();
    } else {
      product.image = null;
      await product.save();
    }

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

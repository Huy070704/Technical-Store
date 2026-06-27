import { ImageController } from "./controllers/image.controller";

export const ImageRouter = {
  name: "Image Upload & Mapping API",
  basePath: "/image",
  routes: [
    {
      path: "/upload",
      method: "POST",
      action: ImageController.prototype.upload,
      upload: "file",
      auth: false,
      description: "Tải ảnh lên hệ thống Cloudinary",
    },
    {
      path: "/attach-to-product",
      method: "POST",
      action: ImageController.prototype.attachToProduct,
      auth: false,
      description: "Gắn liên kết ảnh vào một sản phẩm công nghệ",
    },
    {
      path: "/attach-to-feedback",
      method: "POST",
      action: ImageController.prototype.attachToFeedback,
      auth: false,
      description: "Gắn liên kết ảnh vào một đánh giá khách hàng",
    },
  ],
};

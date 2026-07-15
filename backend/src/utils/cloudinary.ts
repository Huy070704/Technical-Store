import { v2 as cloudinary } from "cloudinary";
import "dotenv/config";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const defaultFolder = process.env.CLOUDINARY_FOLDER || "TechnicalStore";

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string = defaultFolder
): Promise<{ url: string; name: string }> => {
  
  return new Promise((resolve, reject) => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Upload Stream Error:", error);
          return reject(error);
        }
        resolve({
          url: result?.secure_url || "",
          name: result?.public_id || file.originalname
        });
      }
    );

    uploadStream.end(file.buffer);
  });
};

export default cloudinary;

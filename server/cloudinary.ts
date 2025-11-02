import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (file: Express.Multer.File) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto", // Automatically detect if it's an image or video/audio
        folder: "grievance-system",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    // Create a buffer from the file and pipe it to the upload stream
    const buffer = Buffer.from(file.buffer);
    uploadStream.end(buffer);
  });
};

export const uploadMultipleToCloudinary = async (files: Express.Multer.File[]) => {
  const uploadPromises = files.map(file => uploadToCloudinary(file));
  return Promise.all(uploadPromises);
};
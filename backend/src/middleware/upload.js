const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinary");

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB

// Use memory storage so we can upload to Cloudinary or save locally
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

// General uploads (medical reports etc.): images, PDF, Word
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});

// Profile photos only: JPG/PNG/WebP, max 2MB
const imageUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG or WebP images are allowed"), false);
    }
  },
});

/**
 * Middleware to upload file to Cloudinary or local storage after multer processes it
 */
const uploadToCloud = (folder = "shms/reports") => {
  return async (req, res, next) => {
    if (!req.file) return next();

    try {
      const isCloudinaryConfigured =
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_CLOUD_NAME !== "your_cloudinary_cloud_name";

      if (isCloudinaryConfigured) {
        const result = await uploadToCloudinary(req.file.buffer, {
          folder,
          resource_type: req.file.mimetype.startsWith("image/") ? "image" : "raw",
          public_id: `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        });

        req.uploadedFile = {
          url: result.secure_url,
          publicId: result.public_id,
          size: result.bytes,
          type: req.file.mimetype,
          originalName: req.file.originalname,
        };
      } else {
        // Local storage fallback when Cloudinary is not configured
        const subfolder = folder.replace(/^shms\/?/, "") || "general";
        const uploadDir = path.join(__dirname, "../../uploads", subfolder);

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const extMap = {
          "image/jpeg": ".jpg",
          "image/png": ".png",
          "image/webp": ".webp",
          "application/pdf": ".pdf",
        };
        const ext =
          extMap[req.file.mimetype] ||
          path.extname(req.file.originalname).toLowerCase() ||
          ".bin";
        const filename = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext}`;
        const filePath = path.join(uploadDir, filename);

        fs.writeFileSync(filePath, req.file.buffer);

        const protocol = req.protocol || "http";
        const host = req.get("host") || "localhost:5001";
        const fileUrl = `${protocol}://${host}/uploads/${subfolder}/${filename}`;

        req.uploadedFile = {
          url: fileUrl,
          publicId: null,
          size: req.file.size,
          type: req.file.mimetype,
          originalName: req.file.originalname,
        };
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Safely delete an old profile photo (local or Cloudinary)
 */
const deleteOldProfilePhoto = async (url, publicId) => {
  try {
    const isCloudinaryConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== "your_cloudinary_cloud_name";

    if (publicId && isCloudinaryConfigured) {
      await deleteFromCloudinary(publicId, "image").catch(() => {});
    } else if (url && url.includes("/uploads/")) {
      const relativePath = url.split("/uploads/")[1];
      if (relativePath) {
        const uploadsDir = path.resolve(__dirname, "../../uploads");
        const safePath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, '');
        const filePath = path.join(uploadsDir, safePath);
        if (filePath.startsWith(uploadsDir) && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }
  } catch (err) {
    console.error("Failed to delete old photo:", err.message);
  }
};

module.exports = { upload, imageUpload, uploadToCloud, deleteOldProfilePhoto };


const multer = require('multer');
const { uploadToCloudinary } = require('../config/cloudinary');

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB

// Use memory storage so we can upload to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter
});

/**
 * Middleware to upload file to Cloudinary after multer processes it
 */
const uploadToCloud = (folder = 'shms/reports') => {
  return async (req, res, next) => {
    if (!req.file) return next();

    try {
      const result = await uploadToCloudinary(req.file.buffer, {
        folder,
        resource_type: req.file.mimetype === 'application/pdf' ? 'raw' : 'image',
        public_id: `${Date.now()}_${req.file.originalname.replace(/\s+/g, '_')}`
      });

      req.uploadedFile = {
        url: result.secure_url,
        publicId: result.public_id,
        size: result.bytes,
        type: req.file.mimetype,
        originalName: req.file.originalname
      };

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = { upload, uploadToCloud };

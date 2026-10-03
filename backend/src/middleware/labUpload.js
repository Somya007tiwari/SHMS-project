const multer = require('multer');
const { sendError } = require('../utils/responseHandler');
const { validateMagicBytes } = require('./recordUpload');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp'
];

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 3 // max 3 files per upload
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      const err = new Error('Invalid file type. Only PDF, JPG, PNG, and WebP files are allowed.');
      err.statusCode = 400;
      return cb(err, false);
    }
    cb(null, true);
  }
});

const handleLabUpload = (fieldName = 'files') => {
  const uploadArray = upload.array(fieldName, 3);

  return (req, res, next) => {
    uploadArray(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, 'File too large. Maximum allowed file size is 5MB.', 400);
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return sendError(res, 'Too many files. Maximum 3 files allowed per lab report.', 400);
        }
        return sendError(res, `Upload error: ${err.message}`, 400);
      } else if (err) {
        return sendError(res, err.message || 'File upload failed', err.statusCode || 400);
      }

      if (!req.files || req.files.length === 0) {
        return sendError(res, 'No report files attached for upload', 400);
      }

      // Validate magic bytes for each file
      for (const file of req.files) {
        if (!validateMagicBytes(file.buffer, file.mimetype)) {
          return sendError(
            res,
            `Security validation failed: File "${file.originalname}" content does not match its claimed file extension.`,
            400
          );
        }
      }

      next();
    });
  };
};

module.exports = {
  handleLabUpload
};

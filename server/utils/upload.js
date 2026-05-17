const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Whitelist MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf'
];

// Max file sizes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// Ensure upload directory exists
const uploadDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File filter
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('Tipe file tidak diizinkan. Hanya JPG, PNG, WEBP, dan PDF.'), false);
  }
  
  // Check file extension (double check)
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  
  if (!allowedExts.includes(ext)) {
    return cb(new Error('Extension file tidak diizinkan.'), false);
  }
  
  cb(null, true);
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate secure random filename
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const prefix = file.fieldname || 'file';
    cb(null, `${prefix}-${randomName}${ext}`);
  }
});

// Create multer instances
const uploadImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE }
});

const uploadPayment = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE }
});

const uploadDelivery = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE }
});

module.exports = {
  uploadImage,
  uploadPayment,
  uploadDelivery
};

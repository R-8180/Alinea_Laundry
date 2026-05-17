const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;

// Whitelist MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'
];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

// File filter
const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('Tipe file tidak diizinkan. Hanya JPG, PNG, WEBP, dan PDF.'), false);
  }
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  if (!allowedExts.includes(ext)) {
    return cb(new Error('Extension file tidak diizinkan.'), false);
  }
  cb(null, true);
};

// --- STORAGE STRATEGY ---
let storage;

if (isVercel) {
  // On Vercel: use memory storage, then push to Supabase Storage
  storage = multer.memoryStorage();
} else {
  // Local: use disk storage
  const uploadDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadDir)) {
    try { fs.mkdirSync(uploadDir, { recursive: true }); }
    catch (err) { console.error('Failed to create upload directory:', err); }
  }
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const randomName = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${file.fieldname || 'file'}-${randomName}${ext}`);
    }
  });
}

// Upload buffer to Supabase Storage, return public URL
const uploadToSupabase = async (file) => {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const ext = path.extname(file.originalname).toLowerCase();
  const randomName = crypto.randomBytes(16).toString('hex');
  const filename = `${file.fieldname || 'file'}-${randomName}${ext}`;

  const bucketName = process.env.SUPABASE_BUCKET || 'uploads_foto';

  const { error } = await supabase.storage
    .from(bucketName)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) throw new Error(`Supabase storage error: ${error.message}`);

  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filename);

  return data.publicUrl;
};

// Helper to create a wrapped single-file upload middleware
// - On Vercel: runs multer (memoryStorage) then streams to Supabase
// - Locally: runs multer (diskStorage) as normal
const createUploadMiddleware = (multerInstance) => ({
  single: (fieldName) => {
    const multerMiddleware = multerInstance.single(fieldName);
    return async (req, res, next) => {
      multerMiddleware(req, res, async (err) => {
        if (err) return next(err);
        if (req.file && isVercel) {
          try {
            if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
              console.warn('⚠️ SUPABASE_URL atau SUPABASE_SERVICE_KEY belum diset.');
              req.fileUploadError = 'SUPABASE_URL atau SUPABASE_SERVICE_KEY belum diset di server.';
              req.file = null; // skip photo
            } else {
              req.file.supabaseUrl = await uploadToSupabase(req.file);
            }
          } catch (uploadErr) {
            console.error('Supabase upload error:', uploadErr.message);
            req.fileUploadError = uploadErr.message;
            req.file = null; // skip photo
          }
        }
        next();
      });
    };
  }
});

// ✅ Helper to get the correct URL regardless of environment
// Import and use this in every route that handles file uploads
const getFileUrl = (file) => {
  if (!file) return null;
  if (isVercel) return file.supabaseUrl || null;
  return `/uploads/${file.filename}`;
};

const multerOptions = { storage, fileFilter, limits: { fileSize: MAX_IMAGE_SIZE } };

const uploadImage = createUploadMiddleware(multer(multerOptions));
const uploadPayment = createUploadMiddleware(multer(multerOptions));
const uploadDelivery = createUploadMiddleware(multer(multerOptions));

module.exports = { uploadImage, uploadPayment, uploadDelivery, getFileUrl };

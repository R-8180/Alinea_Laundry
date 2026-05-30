const { body, param, query, validationResult } = require('express-validator');

// ──────────────────────────────────────────────────────────────────────
// Auth Validators
// ──────────────────────────────────────────────────────────────────────
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email tidak valid'),
  body('password')
    .if((value, { req }) => !req.body.google_id)
    .isLength({ min: 8 }).withMessage('Password minimal 8 karakter')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password harus mengandung huruf besar, kecil, dan angka'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Nama minimal 2 karakter').escape(),
  body('phone').optional().matches(/^[0-9]{10,15}$/).withMessage('Nomor telepon tidak valid'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Format email tidak valid'),
  body('password').notEmpty().withMessage('Password tidak boleh kosong'),
];

// ──────────────────────────────────────────────────────────────────────
// Order Validators
// ──────────────────────────────────────────────────────────────────────
const createOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('Minimal 1 item'),
  body('items.*.service_type').isIn(['kiloan', 'satuan']).withMessage('Service type tidak valid'),
  body('items.*.name').trim().isLength({ min: 1, max: 100 }).escape().withMessage('Nama item tidak valid'),
  body('address_id').optional().isInt().toInt(),
  body('notes').optional().trim().isLength({ max: 500 }).escape(),
  body('courier_notes').optional().trim().isLength({ max: 500 }).escape(),
  body('service_speed').optional().isIn(['reguler', 'express']),
];

// ──────────────────────────────────────────────────────────────────────
// Address Validators
// ──────────────────────────────────────────────────────────────────────
const addressValidation = [
  body('label').trim().isLength({ min: 1, max: 100 }).escape(),
  body('address').trim().isLength({ min: 5, max: 500 }).escape(),
  body('note').optional().trim().isLength({ max: 300 }).escape(),
  body('lat').optional().isFloat({ min: -90, max: 90 }),
  body('lng').optional().isFloat({ min: -180, max: 180 }),
];

// ──────────────────────────────────────────────────────────────────────
// Admin Validators
// ──────────────────────────────────────────────────────────────────────

/** Validator untuk endpoint admin update status order */
const updateStatusValidation = [
  param('id').isInt({ min: 1 }).toInt().withMessage('ID order tidak valid'),
  body('status')
    .isIn(['menunggu', 'pickup', 'proses', 'antar', 'sedang_diantar', 'selesai', 'batal'])
    .withMessage('Status order tidak valid'),
  body('courier_id').optional().isInt({ min: 1 }).toInt(),
  body('total_price').optional().isInt({ min: 0 }).toInt(),
  body('notes').optional().trim().isLength({ max: 500 }).escape(),
];

/** Validator untuk admin CRUD layanan (services) */
const serviceValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).escape().withMessage('Nama layanan tidak valid'),
  body('category').isIn(['kiloan', 'satuan', 'express']).withMessage('Kategori layanan tidak valid'),
  body('price_per_unit').isInt({ min: 0 }).toInt().withMessage('Harga harus angka positif'),
  body('time_days').optional().isInt({ min: 0 }).toInt(),
  body('time_hours').optional().isInt({ min: 0, max: 23 }).toInt(),
  body('description').optional().trim().isLength({ max: 500 }).escape(),
];

/** Validator untuk query params pencarian di admin dashboard */
const searchValidation = [
  query('search').optional().trim().isLength({ max: 100 }).escape(),
  query('status').optional().isIn(['menunggu', 'pickup', 'proses', 'antar', 'sedang_diantar', 'selesai', 'batal', '']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

// ──────────────────────────────────────────────────────────────────────
// General Validators
// ──────────────────────────────────────────────────────────────────────
const idParamValidation = [
  param('id').isInt({ min: 1 }).toInt().withMessage('ID tidak valid'),
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

/** Fungsi middleware untuk mengeksekusi hasil validasi dan mengembalikan error jika ada */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  createOrderValidation,
  addressValidation,
  updateStatusValidation,
  serviceValidation,
  searchValidation,
  idParamValidation,
  paginationValidation,
  validate
};

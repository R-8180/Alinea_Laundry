const { body, param, query, validationResult } = require('express-validator');

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email tidak valid'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password minimal 8 karakter')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password harus mengandung huruf besar, kecil, dan angka'),
  body('name').trim().isLength({ min: 2 }).withMessage('Nama minimal 2 karakter').escape(),
  body('phone').optional().matches(/^[0-9]{10,15}$/).withMessage('Nomor telepon tidak valid'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const createOrderValidation = [
  body('items').isArray({ min: 1 }).withMessage('Minimal 1 item'),
  body('items.*.service_type').isIn(['kiloan', 'satuan']).withMessage('Service type tidak valid'),
  body('items.*.name').trim().isLength({ min: 1, max: 100 }).escape().withMessage('Nama item tidak valid'),
  body('address_id').optional().isInt().toInt(),
  body('notes').optional().trim().isLength({ max: 500 }).escape(),
  body('courier_notes').optional().trim().isLength({ max: 500 }).escape(),
  body('service_speed').optional().isIn(['reguler', 'express']),
];

const addressValidation = [
  body('label').trim().isLength({ min: 1, max: 100 }).escape(),
  body('address').trim().isLength({ min: 5, max: 500 }).escape(),
  body('lat').optional().isFloat({ min: -90, max: 90 }),
  body('lng').optional().isFloat({ min: -180, max: 180 }),
];

const idParamValidation = [
  param('id').isInt({ min: 1 }).toInt().withMessage('ID tidak valid'),
];

const paginationValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
];

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
  idParamValidation,
  paginationValidation,
  validate
};

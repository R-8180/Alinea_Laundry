const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per 15 min
  message: 'Terlalu banyak request dari IP ini, coba lagi nanti.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter untuk login (prevent brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 login attempts
  skipSuccessfulRequests: true,
  message: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.',
});

// Strict limiter untuk register (prevent spam)
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // max 3 registrations per hour per IP
  message: 'Terlalu banyak registrasi dari IP ini. Coba lagi nanti.',
});

// Payment upload limiter
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // max 20 uploads per 15 min
  message: 'Terlalu banyak upload. Tunggu sebentar.',
});

// Speed limiter (slow down requests, don't block)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50, // allow 50 requests per 15 minutes at full speed
  delayMs: () => 500, // add 500ms delay per request above 50
});

module.exports = {
  apiLimiter,
  loginLimiter,
  registerLimiter,
  uploadLimiter,
  speedLimiter
};

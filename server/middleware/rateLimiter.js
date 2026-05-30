/**
 * ====================================================================
 * MIDDLEWARE: RATE LIMITING & SPEED LIMITING
 * ====================================================================
 * Melindungi API dari brute force, spam, dan serangan DoS dengan
 * membatasi jumlah request per IP dalam jangka waktu tertentu.
 * ====================================================================
 */
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');


// ──────────────────────────────────────────────────────────────────────
// General API Limiter – semua endpoint /api/
// ──────────────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // Maks 100 request per 15 menit
  message: { error: 'Terlalu banyak request dari IP ini. Coba lagi dalam 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ──────────────────────────────────────────────────────────────────────
// Login Limiter – anti brute force
// ──────────────────────────────────────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 30, // Maks 30 percobaan login gagal per 15 menit (lebih longgar untuk admin)
  skipSuccessfulRequests: true, // Tidak menghitung login yang berhasil
  message: { error: 'Terlalu banyak percobaan login gagal. Akun dikunci sementara selama 15 menit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ──────────────────────────────────────────────────────────────────────
// Register Limiter – anti spam akun baru
// ──────────────────────────────────────────────────────────────────────
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 3, // Maks 3 pendaftaran baru per jam per IP
  message: { error: 'Terlalu banyak pendaftaran baru dari IP ini. Coba lagi dalam 1 jam.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ──────────────────────────────────────────────────────────────────────
// Order Limiter – mencegah spam orderan palsu
// ──────────────────────────────────────────────────────────────────────
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // Maks 10 order baru per 15 menit per IP (cukup banyak untuk customer normal)
  message: { error: 'Terlalu banyak orderan dalam waktu singkat. Tunggu sebentar.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ──────────────────────────────────────────────────────────────────────
// Admin Limiter – endpoint admin (lebih longgar tapi tetap terlindungi)
// ──────────────────────────────────────────────────────────────────────
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 200, // Admin boleh akses lebih banyak (untuk dashboard yang banyak fetch data)
  message: { error: 'Terlalu banyak request ke panel admin. Tunggu sebentar.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ──────────────────────────────────────────────────────────────────────
// Payment Upload Limiter
// ──────────────────────────────────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Maks 20 upload per 15 menit
  message: { error: 'Terlalu banyak upload. Tunggu sebentar.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ──────────────────────────────────────────────────────────────────────
// Speed Limiter – memperlambat (bukan memblok) request berlebihan
// ──────────────────────────────────────────────────────────────────────
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50, // 50 request pertama berjalan normal
  delayMs: () => 500, // Request ke-51+ ditambah delay 500ms
});

module.exports = {
  apiLimiter,
  loginLimiter,
  registerLimiter,
  orderLimiter,
  adminLimiter,
  uploadLimiter,
  speedLimiter,
};

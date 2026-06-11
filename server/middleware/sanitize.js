/**
 * ====================================================================
 * MIDDLEWARE: SANITASI INPUT (XSS PREVENTION)
 * ====================================================================
 * Membersihkan semua input dari user (body, query, params) dari
 * skrip berbahaya (XSS) menggunakan DOMPurify sebelum masuk ke routes.
 *
 * Dijalankan SETELAH body-parser dan SEBELUM semua routes API.
 * ====================================================================
 */
const xss = require('xss');

/**
 * Field-field yang TIDAK boleh di-sanitasi karena mengandung data sensitif
 * atau karakter khusus yang valid (email, password, token, dll).
 * DOMPurify bisa merusak karakter seperti '@', '+', atau simbol lain yang valid.
 */
const SKIP_FIELDS = new Set([
  'password', 'email', 'token', 'refresh_token',
  'current_password', 'new_password', 'confirm_password',
  'jwt', 'secret', 'api_key',
]);

/**
 * Membersihkan sebuah nilai string dari tag HTML/XSS berbahaya.
 * @param {*} value - Nilai yang akan dibersihkan
 * @param {string} [key] - Nama field (untuk skip field sensitif)
 * @returns {*} - Nilai yang sudah bersih
 */
function sanitizeValue(value, key) {
  // Jangan sanitasi field sensitif — bisa merusak email/password
  if (key && SKIP_FIELDS.has(key.toLowerCase())) {
    return value;
  }
  if (typeof value === 'string') {
    return xss(value, {
      whiteList: {}, // Tidak ada tag HTML yang diperbolehkan
      stripIgnoreTag: true, // Hapus semua tag yang tidak diizinkan
      stripIgnoreTagBody: ['script', 'style'] // Hapus isi tag script dan style
    });
  }
  // Jika nilai adalah objek atau array, rekursi ke dalamnya
  if (typeof value === 'object' && value !== null) {
    return sanitizeObject(value);
  }
  return value;
}

/**
 * Membersihkan semua property dalam sebuah objek atau elemen dalam array secara rekursif.
 * @param {Object|Array} obj
 * @returns {Object|Array}
 */
function sanitizeObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeValue(item));
  }
  const sanitized = {};
  for (const key of Object.keys(obj)) {
    // Teruskan nama key ke sanitizeValue agar bisa skip field sensitif
    sanitized[key] = sanitizeValue(obj[key], key);
  }
  return sanitized;
}

/**
 * Middleware Express untuk sanitasi otomatis pada req.body, req.query, dan req.params.
 */
const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
};

module.exports = sanitizeInput;

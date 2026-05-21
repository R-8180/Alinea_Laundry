/**
 * ====================================================================
 * ALINEA LAUNDRY - BACKEND SERVER ENTRY POINT (UTAMA)
 * ====================================================================
 * Deskripsi: File inisialisasi utama untuk server backend Express.js.
 * Mengatur modul keamanan, rate limiting, routing, penyajian static
 * assets, koneksi database, dan sistem penanganan error global.
 * 
 * Pengembang: Radit / Alinea Team
 * Teknologi: Node.js, Express, PostgreSQL, Helmet, CORS, JWT
 * ====================================================================
 */

// ==========================================
// 1. IMPORT MODUL & KONFIGURASI ENV
// ==========================================
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const morgan = require('morgan');
const logger = require('./utils/logger');
const { apiLimiter, speedLimiter } = require('./middleware/rateLimiter');
const app = express();
const pool = require('./db');

// ==========================================
// 2. INISIALISASI & AUTO-VERIFIKASI DATABASE
// ==========================================
// Membuat tabel notifications secara otomatis jika belum ada di database
pool.query(`
  CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`).then(() => {
  console.log('✅ Notifications table verified/created');
}).catch(err => {
  console.error('❌ Error verifying notifications table:', err);
});

// Auto-migrate orders table for offline orders
pool.query(`
  ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS is_offline BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_proof VARCHAR(255);
`).then(() => {
  console.log('✅ Orders table verified/migrated for offline orders');
}).catch(err => {
  console.error('❌ Error migrating orders table:', err);
});

// Auto-migrate to change status 'cuci' to 'proses' globally
pool.query(`UPDATE orders SET status = 'proses' WHERE status = 'cuci'`)
  .then(() => {
    console.log('✅ Updated status cuci -> proses in orders table');
  }).catch(err => {
    console.error('❌ Error updating status cuci -> proses:', err);
  });

// ==========================================
// 3. MIDDLEWARE KEAMANAN & PENGATURAN PROXY
// ==========================================
// Mempercayai proxy reverse Vercel untuk mendeteksi IP asli klien (penting untuk rate limiting)
app.set('trust proxy', 1);

// Konfigurasi HTTP Security Headers menggunakan Helmet
// ⚠️ 'unsafe-inline' dihapus dari styleSrc untuk menutup celah XSS via style injection
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],          // Hapus 'unsafe-inline' — gunakan external CSS saja
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],          // Blokir plugin Flash/Java
      frameAncestors: ["'none'"],    // Cegah Clickjacking — tidak bisa di-embed di iframe
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: { features: { camera: ['none'], microphone: ['none'], geolocation: ['self'] } },
}));

// ==========================================
// 4. KONFIGURASI CORS (Cross-Origin Resource Sharing)
// ==========================================
// Menentukan domain asal yang diperbolehkan mengakses API
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    try {
      const parsedUrl = new URL(origin);
      const hostname = parsedUrl.hostname;
      
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
      // Regex untuk memastikan origin berakhiran .vercel.app dan terafiliasi dengan alinea
      const isVercelOrigin = hostname.endsWith('.vercel.app') && 
                             /^[a-zA-Z0-9-]*alinea[a-zA-Z0-9-]*\.vercel\.app$/.test(hostname);

      if (allowedOrigins.indexOf(origin) !== -1 || isLocal || isVercelOrigin) {
        return callback(null, true);
      } else {
        return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
      }
    } catch (err) {
      return callback(new Error('CORS validation error: Invalid origin URL structure.'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ==========================================
// 5. PARSER PAYLOAD (BATAS KAPASITAS DATA)
// ==========================================
// Membatasi payload global maksimal 100kb untuk mencegah serangan DoS (Denial of Service).
// File berukuran besar (upload gambar/bukti bayar) akan dihandle secara terpisah oleh Multer.
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));


// ==========================================
// 6. SISTEM LOGGING (AKSES DAN AKTIVITAS)
// ==========================================
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
if (isVercel) {
  // Menggunakan log standar Vercel untuk environment serverless
  app.use(morgan('common'));
} else {
  // Logging berbasis file lokal untuk environment server mandiri (VPS/Localhost)
  const fs = require('fs');
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
  }
  const accessLogStream = fs.createWriteStream(path.join(logsDir, 'access.log'), { flags: 'a' });
  app.use(morgan('combined', { stream: accessLogStream }));
  if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
  }
}

// ==========================================
// 7. RATE LIMITING & SPEED LIMITING
// ==========================================
// Proteksi endpoint API dari spamming request berlebihan
app.use('/api/', apiLimiter);
app.use('/api/', speedLimiter);

// ==========================================
// 8. REDIRECT HTTPS OTOMATIS (PRODUCTION)
// ==========================================
// Memartikan semua koneksi dialihkan ke protokol HTTPS yang aman di lingkungan production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// ==========================================
// 9. PENYAJIAN FILE STATIS & MEDIA UPLOADS
// ==========================================
// Menyajikan file unggahan (bukti bayar dll) dengan proteksi security header tambahan
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '7d',
  etag: false,
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  }
}));

// Menyajikan aset statis client publik dengan mekanisme caching browser yang optimal
app.use(express.static(path.join(__dirname, '../client/public'), {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|svg|webp|woff|woff2)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// ==========================================
// 10. IMPORT & REGISTRASI ROUTING API
// ==========================================
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const courierRoutes = require('./routes/courier');
const reviewRoutes = require('./routes/reviews');
const trackRoutes = require('./routes/track');
const addressRoutes = require('./routes/addresses');
const servicesRoutes = require('./routes/services');
const notificationRoutes = require('./routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courier', courierRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/notifications', notificationRoutes);

// ==========================================
// 11. SISTEM ROUTING FRONTEND (SPA FALLBACK)
// ==========================================
// Menyajikan hasil build frontend (React) dan menangani routing Single Page Application
app.use(express.static(path.join(__dirname, '../client/build')));
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// ==========================================
// 12. CENTRALIZED ERROR HANDLING (GLOBAL)
// ==========================================
// Mengumpulkan semua error dari route dan menangkapnya di satu tempat terpusat
app.use((err, req, res, next) => {
  // Selalu log error secara penuh ke server (Winston) — TIDAK pernah ke client
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.user?.id
  });

  // Penanganan error CORS
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ error: 'Akses ditolak oleh kebijakan CORS.' });
  }

  // Penanganan error khusus terkait pengunggahan file (Multer)
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File terlalu besar. Maksimal 5MB.' });
    }
    return res.status(400).json({ error: 'Gagal mengupload file.' });
  }

  // Penanganan error tipe file (dari utils/upload.js)
  if (err.message && err.message.includes('Tipe file')) {
    return res.status(400).json({ error: 'Tipe file tidak diizinkan.' });
  }

  // Penanganan error JWT
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Sesi tidak valid. Silakan login ulang.' });
  }

  // ⚠️ PENTING: Jangan pernah expose err.message ke client.
  // Pesan mentah bisa mengandung detail SQL, path file, atau info sensitif lainnya.
  // Detail error sudah dicatat ke log server di atas.
  res.status(err.status || 500).json({
    error: 'Terjadi kesalahan pada server. Tim kami sudah diberitahu.'
  });
});

// ==========================================
// 13. MENJALANKAN SERVER (PORT LISTEN)
// ==========================================
if (process.env.NODE_ENV !== 'production' || !isVercel) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
  });
}

module.exports = app;
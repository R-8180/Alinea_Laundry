require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const morgan = require('morgan');
const logger = require('./utils/logger');
const { apiLimiter, speedLimiter } = require('./middleware/rateLimiter');
const app = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',') 
  : ['http://localhost:3000'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL;
if (isVercel) {
  app.use(morgan('common'));
} else {
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

// Global Rate Limiters
app.use('/api/', apiLimiter);
app.use('/api/', speedLimiter);

// HTTPS Redirect
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// Serve uploads with security
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
  }
}));

// Import routes
const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const courierRoutes = require('./routes/courier');
const reviewRoutes = require('./routes/reviews');
const trackRoutes = require('./routes/track');
const addressRoutes = require('./routes/addresses');
const servicesRoutes = require('./routes/services');

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courier', courierRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/services', servicesRoutes);

// Serve frontend build
app.use(express.static(path.join(__dirname, '../client/build')));
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.user?.id
  });
  
  // Handle specific multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File terlalu besar. Maksimal 5MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  if (err.message && err.message.includes('Tipe file')) {
    return res.status(400).json({ error: err.message });
  }
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

if (process.env.NODE_ENV !== 'production' || !isVercel) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
  });
}

module.exports = app;
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// Serve frontend build (nanti setelah build)
app.use(express.static(path.join(__dirname, '../client/build')));
app.use((req, res, next) => {
  // Jangan ganggu route API atau uploads
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server berjalan di port ${PORT}`);
});
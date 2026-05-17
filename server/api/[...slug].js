const serverless = require('serverless-http');
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Import routes (relative to server folder)
const authRoutes = require('../routes/auth');
const orderRoutes = require('../routes/orders');
const paymentRoutes = require('../routes/payments');
const adminRoutes = require('../routes/admin');
const courierRoutes = require('../routes/courier');
const reviewRoutes = require('../routes/reviews');
const trackRoutes = require('../routes/track');
const addressRoutes = require('../routes/addresses');
const servicesRoutes = require('../routes/services');

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/courier', courierRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/track', trackRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/services', servicesRoutes);

// Export as serverless handler (captures all /api/* via Vercel dynamic route)
module.exports = serverless(app);

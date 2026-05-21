const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { uploadPayment, getFileUrl } = require('../utils/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Customer upload bukti pembayaran
router.post('/:orderId/upload', auth, uploadLimiter, uploadPayment.single('proof'), async (req, res) => {
  if (req.user.role !== 'customer') return res.status(403).json({ message: 'Hanya customer' });
  const orderId = req.params.orderId;
  
  if (req.fileUploadError) {
    return res.status(400).json({ message: `Gagal mengunggah foto ke Supabase: ${req.fileUploadError}` });
  }

  const fileUrl = getFileUrl(req.file);
  if (!fileUrl) {
    return res.status(400).json({ message: 'File bukti pembayaran tidak ditemukan' });
  }

  try {
    // Start transaction if needed, but here simple queries are fine
    // PostgreSQL UPSERT equivalent
    await pool.query(
      `INSERT INTO payments (order_id, payment_proof) 
       VALUES ($1, $2) 
       ON CONFLICT (order_id) 
       DO UPDATE SET payment_proof = $3`,
      [orderId, fileUrl, fileUrl]
    );

    await pool.query(
      'UPDATE orders SET payment_status = $1 WHERE id = $2',
      ['pending', orderId]
    );

    res.json({ message: 'Bukti pembayaran diupload' });
  } catch (err) {
    console.error('Payment upload error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
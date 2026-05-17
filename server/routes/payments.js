const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, 'pay-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Customer upload bukti pembayaran
router.post('/:orderId/upload', auth, upload.single('proof'), (req, res) => {
  if (req.user.role !== 'customer') return res.status(403).json({ message: 'Hanya customer' });
  const orderId = req.params.orderId;
  const fileUrl = `/uploads/${req.file.filename}`;

  db.query(
    'INSERT INTO payments (order_id, payment_proof) VALUES (?, ?) ON DUPLICATE KEY UPDATE payment_proof = ?',
    [orderId, fileUrl, fileUrl],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      // Update payment_status di orders (tidak otomatis paid, hanya menandakan sudah upload)
      db.query('UPDATE orders SET payment_status = "pending" WHERE id = ?', [orderId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Bukti pembayaran diupload' });
      });
    }
  );
});

module.exports = router;
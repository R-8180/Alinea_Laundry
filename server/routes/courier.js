const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, 'delivery-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.use(auth);
router.use((req, res, next) => {
  if (req.user.role !== 'courier') return res.status(403).json({ message: 'Hanya kurir' });
  next();
});

// Order aktif (status bukan selesai)
router.get('/orders', (req, res) => {
  db.query(
    `SELECT o.*, u.name AS customer_name, u.address AS customer_address, u.phone AS customer_phone,
            (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
            (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
            (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
            (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
            (SELECT GROUP_CONCAT(DISTINCT service_type SEPARATOR ', ') FROM order_items WHERE order_id = o.id) AS service_types
     FROM orders o
     JOIN users u ON o.user_id = u.id
     WHERE o.courier_id = ? AND o.status != 'selesai'
     ORDER BY o.created_at DESC`,
    [req.user.id],
    (err, orders) => {
      if (err) return res.status(500).json({ error: err.message });
      if (orders.length === 0) return res.json([]);

      const orderIds = orders.map(o => o.id);
      db.query(
        `SELECT * FROM order_items WHERE order_id IN (?)`,
        [orderIds],
        (err, items) => {
          if (err) return res.status(500).json({ error: err.message });
          const ordersWithItems = orders.map(order => ({
            ...order,
            items: items.filter(item => item.order_id === order.id)
          }));
          res.json(ordersWithItems);
        }
      );
    }
  );
});

// Riwayat pengantaran (status selesai)
router.get('/history', (req, res) => {
  db.query(
    `SELECT o.*, u.name AS customer_name, u.address AS customer_address, u.phone AS customer_phone,
            (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
            (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
            (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
            (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
            (SELECT GROUP_CONCAT(DISTINCT service_type SEPARATOR ', ') FROM order_items WHERE order_id = o.id) AS service_types
     FROM orders o
     JOIN users u ON o.user_id = u.id
     WHERE o.courier_id = ? AND o.status = 'selesai'
     ORDER BY o.created_at DESC`,
    [req.user.id],
    (err, orders) => {
      if (err) return res.status(500).json({ error: err.message });
      if (orders.length === 0) return res.json([]);

      const orderIds = orders.map(o => o.id);
      db.query(
        `SELECT * FROM order_items WHERE order_id IN (?)`,
        [orderIds],
        (err, items) => {
          if (err) return res.status(500).json({ error: err.message });
          const ordersWithItems = orders.map(order => ({
            ...order,
            items: items.filter(item => item.order_id === order.id)
          }));
          res.json(ordersWithItems);
        }
      );
    }
  );
});

// Ambil detail satu order
router.get('/orders/:id', (req, res) => {
  const { id } = req.params;
  db.query(
    `SELECT o.*, u.name AS customer_name, u.address AS customer_address, u.phone AS customer_phone,
            (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
            (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
            (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
            (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
            (SELECT GROUP_CONCAT(DISTINCT service_type SEPARATOR ', ') FROM order_items WHERE order_id = o.id) AS service_types
     FROM orders o
     JOIN users u ON o.user_id = u.id
     WHERE o.id = ?`,
    [id],
    (err, orderRes) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!orderRes.length) return res.status(404).json({ message: 'Tidak ditemukan' });
      db.query('SELECT * FROM order_items WHERE order_id = ?', [id], (err, items) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ...orderRes[0], items });
      });
    }
  );
});

// Update status oleh kurir (tanpa selesai - selesai harus via deliver)
router.put('/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  const allowedStatuses = ['menunggu', 'pickup', 'cuci', 'antar'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Status tidak valid. Gunakan endpoint deliver untuk menyelesaikan.' });
  }

  db.query(
    'UPDATE orders SET status = ? WHERE id = ? AND courier_id = ?',
    [status, orderId, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Status diupdate' });
    }
  );
});

// Selesaikan order + WAJIB upload foto pengantaran
router.post('/orders/:id/deliver', upload.single('photo'), (req, res) => {
  const orderId = req.params.id;

  if (!req.file) {
    return res.status(400).json({ message: 'Foto bukti pengantaran wajib diupload' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  db.query(
    'UPDATE orders SET status = "selesai", delivery_proof = ? WHERE id = ? AND courier_id = ?',
    [fileUrl, orderId, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) {
        return res.status(403).json({ message: 'Order tidak ditemukan atau bukan milik kurir ini' });
      }
      res.json({ message: 'Pesanan berhasil diselesaikan', delivery_proof: fileUrl });
    }
  );
});

// Upload foto saat jemput (pickup)
router.post('/orders/:id/pickup-photo', upload.single('photo'), (req, res) => {
  const orderId = req.params.id;
  if (!req.file) return res.status(400).json({ message: 'Foto wajib diupload' });
  const fileUrl = `/uploads/${req.file.filename}`;
  db.query(
    'UPDATE orders SET photo_url = ? WHERE id = ? AND courier_id = ?',
    [fileUrl, orderId, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Foto jemputan berhasil diupload', photo_url: fileUrl });
    }
  );
});

// Statistik kurir
router.get('/stats', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  db.query(
    `SELECT 
       (SELECT COUNT(*) FROM orders WHERE courier_id = ? AND status != 'selesai') AS active,
       (SELECT COUNT(*) FROM orders WHERE courier_id = ? AND DATE(created_at) = ?) AS today_total,
       (SELECT COUNT(*) FROM orders WHERE courier_id = ? AND status = 'selesai' AND DATE(created_at) = ?) AS today_delivered
    `,
    [req.user.id, req.user.id, today, req.user.id, today],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results[0]);
    }
  );
});

module.exports = router;
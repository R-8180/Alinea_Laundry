const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { uploadDelivery, getFileUrl } = require('../utils/upload');

router.use(auth);
router.use((req, res, next) => {
  if (req.user.role !== 'courier') return res.status(403).json({ message: 'Hanya kurir' });
  next();
});

router.get('/orders', async (req, res) => {
  try {
    const ordersRes = await pool.query(
      `SELECT o.*, u.name AS customer_name, u.address AS customer_address, u.phone AS customer_phone,
              (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
              (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
              (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
              (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
              (SELECT string_agg(DISTINCT service_type, ', ') FROM order_items WHERE order_id = o.id) AS service_types
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.courier_id = $1 AND o.status != 'selesai'
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    if (ordersRes.rows.length === 0) return res.json([]);

    const orderIds = ordersRes.rows.map(o => o.id);
    const itemsRes = await pool.query(`SELECT * FROM order_items WHERE order_id = ANY($1)`, [orderIds]);

    const ordersWithItems = ordersRes.rows.map(order => ({
      ...order,
      items: itemsRes.rows.filter(item => item.order_id === order.id)
    }));
    res.json(ordersWithItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/history', async (req, res) => {
  try {
    const ordersRes = await pool.query(
      `SELECT o.*, u.name AS customer_name, u.address AS customer_address, u.phone AS customer_phone,
              (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
              (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
              (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
              (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
              (SELECT string_agg(DISTINCT service_type, ', ') FROM order_items WHERE order_id = o.id) AS service_types
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.courier_id = $1 AND o.status = 'selesai'
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    if (ordersRes.rows.length === 0) return res.json([]);

    const orderIds = ordersRes.rows.map(o => o.id);
    const itemsRes = await pool.query(`SELECT * FROM order_items WHERE order_id = ANY($1)`, [orderIds]);

    const ordersWithItems = ordersRes.rows.map(order => ({
      ...order,
      items: itemsRes.rows.filter(item => item.order_id === order.id)
    }));
    res.json(ordersWithItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const orderRes = await pool.query(
      `SELECT o.*, u.name AS customer_name, u.address AS customer_address, u.phone AS customer_phone,
              (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
              (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
              (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
              (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
              (SELECT string_agg(DISTINCT service_type, ', ') FROM order_items WHERE order_id = o.id) AS service_types
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = $1`,
      [id]
    );

    if (!orderRes.rows.length) return res.status(404).json({ message: 'Tidak ditemukan' });
    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);
    res.json({ ...orderRes.rows[0], items: itemsRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  const allowedStatuses = ['menunggu', 'pickup', 'cuci', 'antar'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Status tidak valid. Gunakan endpoint deliver untuk menyelesaikan.' });
  }

  try {
    await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 AND courier_id = $3',
      [status, orderId, req.user.id]
    );
    res.json({ message: 'Status diupdate' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders/:id/deliver', uploadDelivery.single('photo'), async (req, res) => {
  const orderId = req.params.id;

  const fileUrl = getFileUrl(req.file);
  if (!fileUrl) {
    const errorMsg = req.fileUploadError 
      ? `Gagal mengunggah foto ke Supabase: ${req.fileUploadError}`
      : 'Foto bukti pengantaran wajib diupload';
    return res.status(400).json({ message: errorMsg });
  }

  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1, delivery_proof = $2 WHERE id = $3 AND courier_id = $4',
      ['selesai', fileUrl, orderId, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(403).json({ message: 'Order tidak ditemukan atau bukan milik kurir ini' });
    }
    res.json({ message: 'Pesanan berhasil diselesaikan', delivery_proof: fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/orders/:id/pickup-photo', uploadDelivery.single('photo'), async (req, res) => {
  const orderId = req.params.id;
  if (!req.file) {
    const errorMsg = req.fileUploadError 
      ? `Gagal mengunggah foto ke Supabase: ${req.fileUploadError}`
      : 'Foto wajib diupload';
    return res.status(400).json({ message: errorMsg });
  }
  
  const fileUrl = getFileUrl(req.file);
  if (!fileUrl) {
    const errorMsg = req.fileUploadError 
      ? `Gagal mengunggah foto ke Supabase: ${req.fileUploadError}`
      : 'Foto gagal diproses';
    return res.status(400).json({ message: errorMsg });
  }
  try {
    await pool.query(
      'UPDATE orders SET photo_url = $1 WHERE id = $2 AND courier_id = $3',
      [fileUrl, orderId, req.user.id]
    );
    res.json({ message: 'Foto jemputan berhasil diupload', photo_url: fileUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const result = await pool.query(
      `SELECT 
         (SELECT COUNT(*) FROM orders WHERE courier_id = $1 AND status != 'selesai')::integer AS active,
         (SELECT COUNT(*) FROM orders WHERE courier_id = $2 AND created_at::date = $3::date)::integer AS today_total,
         (SELECT COUNT(*) FROM orders WHERE courier_id = $4 AND status = 'selesai' AND created_at::date = $5::date)::integer AS today_delivered
      `,
      [req.user.id, req.user.id, today, req.user.id, today]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
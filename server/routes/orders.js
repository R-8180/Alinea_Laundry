const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const { uploadImage, getFileUrl } = require('../utils/upload');
const { createOrderValidation, validate } = require('../utils/validators');

function generateOrderCode() {
  const d = new Date();
  const yymmdd = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${yymmdd}-${rand}`;
}

const parseItems = (req, res, next) => {
  if (req.body.items && typeof req.body.items === 'string') {
    try {
      req.body.items = JSON.parse(req.body.items);
    } catch (err) {
      // ignore and let express-validator catch it
    }
  }
  next();
};

// POST – Buat order
router.post('/', auth, uploadImage.single('photo'), parseItems, createOrderValidation, validate, async (req, res) => {
  if (req.user.role !== 'customer') return res.status(403).json({ message: 'Hanya customer' });

  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Minimal satu item' });

  const userId = req.user.id;
  const address_id = req.body.address_id || null;
  const notes = req.body.notes || '';
  const courier_notes = req.body.courier_notes || '';
  const service_speed = req.body.service_speed || 'reguler';
  const service_id = req.body.service_id || null;
  const voucher_code = req.body.voucher_code || null;
  const photo_url = getFileUrl(req.file);
  const orderCode = generateOrderCode();

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let addressText = req.body.address || '';
    if (address_id) {
      const addrRes = await client.query('SELECT address FROM addresses WHERE id = $1 AND user_id = $2', [address_id, userId]);
      if (addrRes.rows.length === 0) throw new Error('Alamat tidak ditemukan');
      addressText = addrRes.rows[0].address;
    }

    const sresults = await client.query('SELECT price_per_unit, time_days, time_hours FROM services WHERE id = $1', [service_id]);
    const estDays = sresults.rows.length > 0 ? parseInt(sresults.rows[0].time_days) || 0 : 0;
    const estHours = sresults.rows.length > 0 ? parseInt(sresults.rows[0].time_hours) || 0 : 0;
    // Cast DECIMAL price from services to INTEGER (order_items.price_per_unit is INTEGER)
    const realPrice = sresults.rows.length > 0 ? Math.round(parseFloat(sresults.rows[0].price_per_unit)) : null;

    let discount = 0;
    if (voucher_code) {
      const vresults = await client.query('SELECT * FROM vouchers WHERE code = $1 AND user_id = $2 AND used = FALSE', [voucher_code, userId]);
      if (vresults.rows.length === 0) throw new Error('Voucher tidak valid');
      await client.query('UPDATE vouchers SET used = TRUE WHERE code = $1', [voucher_code]);
      discount = 100;
    }

    const orderRes = await client.query(
      `INSERT INTO orders (user_id, order_code, address, address_id, notes, courier_notes, photo_url, service_speed, voucher_code, discount, estimated_days, estimated_hours, estimated_start) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) RETURNING id`,
      [userId, orderCode, addressText, address_id, notes, courier_notes, photo_url, service_speed, voucher_code, discount, estDays, estHours]
    );
    const orderId = orderRes.rows[0].id;

    for (const item of items) {
      const price = realPrice !== null ? realPrice : (item.service_type === 'kiloan' ? 7000 : 5000);
      await client.query(
        `INSERT INTO order_items (order_id, service_id, service_type, name, notes, weight, qty_items, price_per_unit, parfum, parfum_price) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [orderId, service_id || null, item.service_type, item.name || '', item.notes || '', 0, 0, Math.round(price), item.parfum || '', 0]
      );
    }

    await client.query('UPDATE users SET points = points + 10 WHERE id = $1', [userId]);
    await client.query('COMMIT');
    res.json({ message: 'Order berhasil', order_code: orderCode, id: orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Order error:', err);
    res.status(err.message === 'Alamat tidak ditemukan' || err.message === 'Voucher tidak valid' ? 400 : 500).json({ error: err.message || 'Server error' });
  } finally {
    client.release();
  }
});

router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'customer') return res.status(403).json({ message: 'Hanya customer' });
  try {
    const result = await pool.query(
      `SELECT o.*, u.name AS courier_name, p.payment_proof,
              (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
              (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
              (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
              (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
              (SELECT string_agg(DISTINCT service_type, ', ') FROM order_items WHERE order_id = o.id) AS service_types
       FROM orders o
       LEFT JOIN users u ON o.courier_id = u.id
       LEFT JOIN payments p ON p.order_id = o.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  const orderId = req.params.id;
  try {
    const orderRes = await pool.query(
      `SELECT o.*, u.name AS courier_name, u.phone AS courier_phone,
              p.payment_proof, p.created_at AS payment_date,
              (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
              (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
              (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
              (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
              (SELECT string_agg(DISTINCT service_type, ', ') FROM order_items WHERE order_id = o.id) AS service_types
       FROM orders o
       LEFT JOIN users u ON o.courier_id = u.id
       LEFT JOIN payments p ON p.order_id = o.id
       WHERE o.id = $1 AND o.user_id = $2`,
      [orderId, req.user.id]
    );
    if (orderRes.rows.length === 0) return res.status(404).json({ message: 'Order tidak ditemukan' });

    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    res.json({ ...orderRes.rows[0], items: itemsRes.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/complete', auth, async (req, res) => {
  if (req.user.role !== 'customer') return res.status(403).json({ message: 'Hanya customer' });
  try {
    await pool.query('UPDATE orders SET status = $1 WHERE id = $2 AND user_id = $3', ['selesai', req.params.id, req.user.id]);
    await pool.query('UPDATE users SET points = points + 10 WHERE id = $1', [req.user.id]);
    res.json({ message: 'Pesanan selesai, poin bertambah' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/cancel', auth, async (req, res) => {
  if (req.user.role !== 'customer') return res.status(403).json({ message: 'Hanya customer' });
  try {
    const result = await pool.query(
      'UPDATE orders SET status = $1 WHERE id = $2 AND user_id = $3 AND status = $4',
      ['batal', req.params.id, req.user.id, 'menunggu']
    );
    if (result.rowCount === 0) return res.status(400).json({ message: 'Pesanan tidak ditemukan atau tidak bisa dibatalkan' });
    res.json({ message: 'Pesanan berhasil dibatalkan' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/voucher/status', auth, async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) AS ready FROM orders WHERE user_id = $1 AND status = 'selesai' AND discount = 0`, [req.user.id]);
    const readyOrders = parseInt(result.rows[0].ready, 10);
    const canClaim = readyOrders >= 5;
    res.json({ canClaim, need: canClaim ? 0 : 5 - readyOrders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/voucher/claim', auth, async (req, res) => {
  try {
    const result = await pool.query(`SELECT COUNT(*) AS ready FROM orders WHERE user_id = $1 AND status = 'selesai' AND discount = 0`, [req.user.id]);
    if (parseInt(result.rows[0].ready, 10) < 5) return res.status(400).json({ message: 'Minimal 5 order selesai' });

    await pool.query(
      `UPDATE orders SET discount = 1 WHERE id IN (
         SELECT id FROM orders WHERE user_id = $1 AND status = 'selesai' AND discount = 0 ORDER BY created_at ASC LIMIT 5
       )`,
      [req.user.id]
    );

    const code = 'VOC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    await pool.query('INSERT INTO vouchers (user_id, code) VALUES ($1, $2)', [req.user.id, code]);
    res.json({ message: 'Voucher berhasil diklaim', code });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/voucher/list', auth, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vouchers WHERE user_id = $1 AND used = FALSE', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
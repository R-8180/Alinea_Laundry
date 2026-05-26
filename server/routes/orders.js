const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const crypto = require('crypto');
const { uploadImage, getFileUrl } = require('../utils/upload');
const { createOrderValidation, idParamValidation, validate } = require('../utils/validators');
const { notifyAdmins } = require('../utils/notifications');
const { orderLimiter } = require('../middleware/rateLimiter');

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

// POST – Buat order (dilindungi orderLimiter agar tidak bisa spam orderan palsu)
router.post('/', auth, orderLimiter, uploadImage.single('photo'), parseItems, createOrderValidation, validate, async (req, res) => {
  if (req.user.role !== 'customer') return res.status(403).json({ message: 'Hanya customer' });

  const items = req.body.items;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Minimal satu item' });

  const userId = req.user.id;
  const address_id = req.body.address_id || null;
  const branch_id = req.body.branch_id || null;
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
      const addrRes = await pool.query('SELECT address, note FROM addresses WHERE id = $1 AND user_id = $2', [address_id, userId]);
      if (addrRes.rows.length === 0) throw new Error('Alamat tidak ditemukan');
      const addr = addrRes.rows[0];
      addressText = addr.note ? `${addr.address} (${addr.note})` : addr.address;
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
      discount = 0; // voucher does not reduce automatically, handled by admin manually via negative additional_charge
    }

    const orderRes = await client.query(
      `INSERT INTO orders (user_id, order_code, address, address_id, branch_id, notes, courier_notes, photo_url, service_speed, voucher_code, discount, estimated_days, estimated_hours, estimated_start) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()) RETURNING id`,
      [userId, orderCode, addressText, address_id, branch_id, notes, courier_notes, photo_url, service_speed, voucher_code, discount, estDays, estHours]
    );
    const orderId = orderRes.rows[0].id;

    if (items.length > 0) {
      const insertValues = [];
      const valuePlaceholders = [];
      let paramIndex = 1;

      for (const item of items) {
        const price = realPrice !== null ? realPrice : (item.service_type === 'kiloan' ? 7000 : 5000);
        valuePlaceholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        insertValues.push(
          orderId,
          service_id || null,
          item.service_type,
          item.name || '',
          item.notes || '',
          0,
          0,
          Math.round(price),
          item.parfum || '',
          0
        );
      }

      const bulkSql = `INSERT INTO order_items (order_id, service_id, service_type, name, notes, weight, qty_items, price_per_unit, parfum, parfum_price) VALUES ${valuePlaceholders.join(', ')}`;
      await client.query(bulkSql, insertValues);
    }

    await client.query('UPDATE users SET points = points + 10 WHERE id = $1', [userId]);
    await client.query('COMMIT');
    
    // Notify admins about the new order asynchronously
    notifyAdmins(orderId, 'new_order').catch(err => console.error('Admin notification error:', err));

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
      `SELECT o.*, u.name AS courier_name, u.phone AS courier_phone, p.payment_proof, b.name AS branch_name,
              (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
              (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
              (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
              (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
              (SELECT string_agg(DISTINCT service_type, ', ') FROM order_items WHERE order_id = o.id) AS service_types,
              (SELECT voucher_name FROM vouchers WHERE code = o.voucher_code LIMIT 1) AS voucher_name
       FROM orders o
       LEFT JOIN users u ON o.courier_id = u.id
       LEFT JOIN payments p ON p.order_id = o.id
       LEFT JOIN branches b ON o.branch_id = b.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', auth, idParamValidation, validate, async (req, res) => {
  const orderId = req.params.id;
  try {
    const orderRes = await pool.query(
      `SELECT o.*, u.name AS courier_name, u.phone AS courier_phone, b.name AS branch_name,
              p.payment_proof, p.created_at AS payment_date,
              (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
              (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
              (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
              (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
              (SELECT string_agg(DISTINCT service_type, ', ') FROM order_items WHERE order_id = o.id) AS service_types,
              (SELECT voucher_name FROM vouchers WHERE code = o.voucher_code LIMIT 1) AS voucher_name
       FROM orders o
       LEFT JOIN users u ON o.courier_id = u.id
       LEFT JOIN payments p ON p.order_id = o.id
       LEFT JOIN branches b ON o.branch_id = b.id
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

router.put('/:id/complete', auth, idParamValidation, validate, async (req, res) => {
  return res.status(403).json({ message: 'Customer tidak diperbolehkan menyelesaikan pesanan secara langsung.' });
});

router.put('/:id/cancel', auth, idParamValidation, validate, async (req, res) => {
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
    const userResult = await pool.query('SELECT points FROM users WHERE id = $1', [req.user.id]);
    const points = userResult.rows[0]?.points || 0;
    
    const templatesResult = await pool.query('SELECT * FROM voucher_templates WHERE is_active = TRUE ORDER BY points_required ASC');
    
    res.json({ points, templates: templatesResult.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/voucher/claim', auth, async (req, res) => {
  const { template_id } = req.body;
  if (!template_id) return res.status(400).json({ message: 'Pilih voucher' });
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const userRes = await client.query('SELECT points FROM users WHERE id = $1 FOR UPDATE', [req.user.id]);
    const points = userRes.rows[0]?.points || 0;
    
    const templateRes = await client.query('SELECT * FROM voucher_templates WHERE id = $1 AND is_active = TRUE', [template_id]);
    if (templateRes.rows.length === 0) throw new Error('Voucher tidak ditemukan');
    
    const template = templateRes.rows[0];
    if (points < template.points_required) throw new Error('Poin tidak mencukupi');
    
    await client.query('UPDATE users SET points = points - $1 WHERE id = $2', [template.points_required, req.user.id]);
    
    const code = 'VOC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    await client.query(
      'INSERT INTO vouchers (user_id, code, voucher_name, discount_amount) VALUES ($1, $2, $3, $4)',
      [req.user.id, code, template.name, template.discount_amount]
    );
    
    await client.query('COMMIT');
    res.json({ message: 'Voucher berhasil diklaim', code });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message || 'Gagal klaim' });
  } finally {
    client.release();
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
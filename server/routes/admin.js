const express = require('express');
const router = express.Router();
const db = require('../db'); // db is pg.Pool
const auth = require('../middleware/auth');
const { uploadDelivery, getFileUrl } = require('../utils/upload');

router.use(auth);
router.use((req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Akses ditolak' });
  next();
});

// GET daftar kurir
router.get('/couriers', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, phone FROM users WHERE role = 'courier' ORDER BY name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get couriers error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET semua order dengan badge perlu_validasi
router.get('/orders', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT o.*, u.name AS customer_name, u.phone AS phone,
              c.name AS courier_name,
              p.payment_proof,
              (SELECT COUNT(*) FROM payments WHERE order_id = o.id AND validated = FALSE)::integer AS need_validation,
              (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
              (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
              (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
              (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
              (SELECT string_agg(DISTINCT service_type, ', ') FROM order_items WHERE order_id = o.id) AS service_types
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN users c ON o.courier_id = c.id
       LEFT JOIN payments p ON p.order_id = o.id
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get admin orders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET detail order dengan alamat + info voucher
router.get('/orders/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const orderRes = await db.query(
      `SELECT o.*, u.name AS customer_name, u.address AS customer_address, u.phone AS phone,
              p.payment_proof, p.created_at AS payment_date, p.validated AS payment_validated,
              (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
              (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
              (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
              (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
              (SELECT string_agg(DISTINCT service_type, ', ') FROM order_items WHERE order_id = o.id) AS service_types
       FROM orders o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN payments p ON p.order_id = o.id
       WHERE o.id = $1`,
      [id]
    );

    if (orderRes.rows.length === 0) return res.status(404).json({ message: 'Tidak ditemukan' });

    const itemsRes = await db.query(
      `SELECT oi.*, 
              COALESCE(s.price_per_unit, oi.price_per_unit) AS current_price 
       FROM order_items oi 
       LEFT JOIN services s ON oi.service_id = s.id 
       WHERE oi.order_id = $1`,
      [id]
    );

    const updatedItems = itemsRes.rows.map(i => {
      const { current_price, ...rest } = i;
      return { ...rest, price_per_unit: current_price };
    });

    res.json({ ...orderRes.rows[0], items: updatedItems });
  } catch (err) {
    console.error('Get admin order detail error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET daftar semua customer + total order + last order
router.get('/customers', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.created_at,
              COUNT(o.id)::integer AS total_orders,
              MAX(o.created_at) AS last_order_at
       FROM users u
       LEFT JOIN orders o ON o.user_id = u.id
       WHERE u.role = 'customer' OR u.role IS NULL
       GROUP BY u.id
       ORDER BY last_order_at DESC, u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET riwayat order singkat per customer
router.get('/customers/:id/orders', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT o.id, o.order_code, o.status, o.total_price, o.service_speed,
              o.payment_status, o.created_at, o.voucher_code, o.address
       FROM orders o
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get customer orders error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST buat order baru atas nama customer (oleh admin)
router.post('/orders/create', async (req, res) => {
  const { customer_id, address, notes, service_speed, items } = req.body;
  if (!customer_id || !address || !items || items.length === 0) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }

  const crypto = require('crypto');
  const d = new Date();
  const yymmdd = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  const orderCode = `ORD-${yymmdd}-${rand}`;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const orderRes = await client.query(
      'INSERT INTO orders (user_id, order_code, address, notes, service_speed) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [customer_id, orderCode, address, notes || '', service_speed || 'reguler']
    );
    const orderId = orderRes.rows[0].id;

    for (const item of items) {
      await client.query(
        `INSERT INTO order_items (order_id, service_type, name, notes, weight, qty_items, price_per_unit, parfum, parfum_price) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          orderId,
          item.service_type || 'kiloan',
          item.name || '',
          item.notes || '',
          0,
          0,
          item.service_type === 'kiloan' ? 7000 : 5000,
          item.parfum || 'Random',
          0
        ]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Order berhasil dibuat', order_code: orderCode, id: orderId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Admin create order error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET statistik kemarin (untuk persentase perubahan)
router.get('/stats/yesterday', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  try {
    const result = await db.query(
      `SELECT 
         (SELECT COUNT(*) FROM orders WHERE created_at::date = $1)::integer AS orders_today,
         (SELECT COUNT(*) FROM orders WHERE created_at::date = $2)::integer AS orders_yesterday,
         (SELECT COUNT(*) FROM orders WHERE status != 'selesai')::integer AS active_today,
         (SELECT COUNT(*) FROM orders WHERE status != 'selesai' AND created_at::date = $3)::integer AS active_yesterday,
         (SELECT COUNT(*) FROM orders WHERE status = 'selesai' AND created_at::date = $4)::integer AS done_today,
         (SELECT COUNT(*) FROM orders WHERE status = 'selesai' AND created_at::date = $5)::integer AS done_yesterday,
         COALESCE((SELECT SUM(total_price) FROM orders WHERE payment_status = 'paid' AND created_at::date = $6), 0)::integer AS revenue_today,
         COALESCE((SELECT SUM(total_price) FROM orders WHERE payment_status = 'paid' AND created_at::date = $7), 0)::integer AS revenue_yesterday
      `,
      [today, yesterday, yesterday, today, yesterday, today, yesterday]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Stats yesterday error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT assign kurir + estimasi + express_fee
router.put('/orders/:id/assign', async (req, res) => {
  const { courier_id, estimated_days, estimated_hours, express_fee } = req.body;
  const orderId = req.params.id;

  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (courier_id !== undefined && courier_id !== null) {
    updates.push(`courier_id = $${paramIndex++}`);
    values.push(courier_id);
  }
  if (estimated_days !== undefined && estimated_days !== null) {
    updates.push(`estimated_days = $${paramIndex++}`);
    values.push(parseInt(estimated_days) || 0);
  }
  if (estimated_hours !== undefined && estimated_hours !== null) {
    updates.push(`estimated_hours = $${paramIndex++}`);
    values.push(parseInt(estimated_hours) || 0);
  }
  if (express_fee !== undefined && express_fee !== null) {
    updates.push(`express_fee = $${paramIndex++}`);
    values.push(Math.round(parseFloat(express_fee)) || 0);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'Tidak ada data yang dikirim' });
  }

  if (estimated_days !== undefined || estimated_hours !== undefined) {
    updates.push(`estimated_start = NOW()`);
  }

  values.push(orderId);
  const sql = `UPDATE orders SET ${updates.join(', ')} WHERE id = $${paramIndex}`;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql, values);

    if (express_fee !== undefined) {
      const itemsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
      let subtotal = 0;
      itemsRes.rows.forEach(item => {
        // item.weight & price_per_unit from DB can be string/decimal, cast explicitly
        const w = parseFloat(item.weight) || 0;
        const qty = parseInt(item.qty_items) || 0;
        const ppu = parseInt(item.price_per_unit) || 0;
        subtotal += item.service_type === 'kiloan'
          ? w * (ppu || 7000)
          : qty * (ppu || 5000);
      });
      const total = subtotal + (express_fee || 0);

      await client.query('UPDATE orders SET total_price = $1 WHERE id = $2', [total, orderId]);
      const r = await client.query('SELECT estimated_start FROM orders WHERE id = $1', [orderId]);

      await client.query('COMMIT');
      res.json({ message: 'Data diperbarui', total, estimated_start: r.rows[0]?.estimated_start || null });
    } else {
      const r = await client.query('SELECT estimated_start FROM orders WHERE id = $1', [orderId]);
      await client.query('COMMIT');
      res.json({ message: 'Data diperbarui', estimated_start: r.rows[0]?.estimated_start || null });
    }
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Assign order error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

router.put('/orders/:id/reset-estimasi', async (req, res) => {
  const orderId = req.params.id;
  try {
    await db.query('UPDATE orders SET estimated_days = 0, estimated_hours = 0 WHERE id = $1', [orderId]);
    res.json({ message: 'Estimasi direset' });
  } catch (err) {
    console.error('Reset estimation error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/orders/:id/validate-items', async (req, res) => {
  const { items, express_fee, admin_note } = req.body;
  const orderId = req.params.id;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const validItems = items.filter(i => i.item_id);

    for (const item of validItems) {
      if (item.manual_price !== undefined) {
        const isKiloan = item.weight !== undefined;
        const field = isKiloan ? 'weight' : 'qty_items';
        // Cast user inputs: price to integer, weight to float, qty to integer
        const priceInt = Math.round(parseFloat(item.manual_price)) || 0;
        const value = isKiloan ? (parseFloat(item.weight) || 0) : (parseInt(item.qty) || 1);

        await client.query(
          `UPDATE order_items SET price_per_unit = $1, ${field} = $2 WHERE id = $3 AND order_id = $4`,
          [priceInt, value, item.item_id, orderId]
        );
      } else {
        const itemResult = await client.query('SELECT service_id FROM order_items WHERE id = $1', [item.item_id]);
        const serviceId = itemResult.rows[0]?.service_id;

        if (serviceId) {
          const serviceResult = await client.query('SELECT price_per_unit FROM services WHERE id = $1', [serviceId]);
          // Cast DECIMAL price to INTEGER for order_items.price_per_unit column
          const servicePrice = serviceResult.rows[0]?.price_per_unit
            ? Math.round(parseFloat(serviceResult.rows[0].price_per_unit))
            : (item.weight !== undefined ? 7000 : 5000);
          const field = item.weight !== undefined ? 'weight' : 'qty_items';
          const value = item.weight !== undefined ? (parseFloat(item.weight) || 0) : (parseInt(item.qty) || 0);

          await client.query(
            `UPDATE order_items SET ${field} = $1, price_per_unit = $2 WHERE id = $3 AND order_id = $4`,
            [value, servicePrice, item.item_id, orderId]
          );
        } else {
          const field = item.weight !== undefined ? 'weight' : 'qty_items';
          const value = item.weight !== undefined ? (parseFloat(item.weight) || 0) : (parseInt(item.qty) || 0);
          await client.query(
            `UPDATE order_items SET ${field} = $1 WHERE id = $2 AND order_id = $3`,
            [value, item.item_id, orderId]
          );
        }
      }
    }

    // Hitung ulang total
    const rowsRes = await client.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);
    let subtotal = 0;
    rowsRes.rows.forEach(item => {
      // Cast DB DECIMAL/string values to proper JS numbers before arithmetic
      const w = parseFloat(item.weight) || 0;
      const qty = parseInt(item.qty_items) || 0;
      const ppu = parseInt(item.price_per_unit) || 0;
      const price = ppu || (item.service_type === 'kiloan' ? 7000 : 5000);
      if (item.service_type === 'kiloan' || (w > 0 && !qty)) {
        subtotal += w * price;
      } else {
        subtotal += qty * price;
      }
    });

    const total = Math.round(subtotal + (parseFloat(express_fee) || 0));
    await client.query('UPDATE orders SET total_price = $1, admin_note = $2 WHERE id = $3', [total, admin_note || null, orderId]);

    await client.query('COMMIT');
    res.json({ message: 'Item divalidasi', total });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Validate items error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// PUT update status
router.put('/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;

  const allowedStatuses = ['menunggu', 'pickup', 'cuci', 'antar', 'selesai', 'batal'];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Status tidak valid' });
  }

  try {
    await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId]);
    res.json({ message: 'Status diupdate' });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT admin selesaikan pesanan + upload foto (opsional)
router.put('/orders/:id/complete', uploadDelivery.single('photo'), async (req, res) => {
  const orderId = req.params.id;
  const photoUrl = getFileUrl(req.file);

  const updates = ['status = $1'];
  const values = ['selesai'];
  let paramIndex = 2;

  if (photoUrl) {
    updates.push(`delivery_proof = $${paramIndex++}`);
    values.push(photoUrl);
  }
  values.push(orderId);
  const sql = `UPDATE orders SET ${updates.join(', ')} WHERE id = $${paramIndex}`;

  try {
    const result = await db.query(sql, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }
    res.json({ message: 'Pesanan berhasil diselesaikan', delivery_proof: photoUrl });
  } catch (err) {
    console.error('Complete order error:', err);
    return res.status(500).json({ error: err.message || 'Database error' });
  }
});

// PUT validasi pembayaran
router.put('/payments/validate/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE payments SET validated = true WHERE order_id = $1', [orderId]);
    await client.query('UPDATE orders SET payment_status = $1 WHERE id = $2', ['paid', orderId]);
    await client.query('COMMIT');
    res.json({ message: 'Pembayaran divalidasi' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Validate payment error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// GET keuangan
router.get('/financial', async (req, res) => {
  const { start, end, year, month } = req.query;
  let query = `SELECT 
    SUM(total_price) AS total_pendapatan, 
    COUNT(*) AS total_order 
    FROM orders WHERE payment_status = 'paid'`;
  const params = [];
  let paramIndex = 1;

  if (start && end) {
    query += ` AND created_at::date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
    params.push(start, end);
  } else if (year && month) {
    query += ` AND EXTRACT(YEAR FROM created_at) = $${paramIndex++} AND EXTRACT(MONTH FROM created_at) = $${paramIndex++}`;
    params.push(parseInt(year), parseInt(month));
  } else if (year) {
    query += ` AND EXTRACT(YEAR FROM created_at) = $${paramIndex++}`;
    params.push(parseInt(year));
  }

  try {
    const result = await db.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get financial stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Data grafik harian
router.get('/chart', async (req, res) => {
  const { start, end, year, month } = req.query;
  let query = `SELECT created_at::date AS date, SUM(total_price) AS total
    FROM orders WHERE payment_status = 'paid'`;
  const params = [];
  let paramIndex = 1;

  if (start && end) {
    query += ` AND created_at::date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
    params.push(start, end);
  } else if (year && month) {
    query += ` AND EXTRACT(YEAR FROM created_at) = $${paramIndex++} AND EXTRACT(MONTH FROM created_at) = $${paramIndex++}`;
    params.push(parseInt(year), parseInt(month));
  } else if (year) {
    query += ` AND EXTRACT(YEAR FROM created_at) = $${paramIndex++}`;
    params.push(parseInt(year));
  } else {
    query += ` AND created_at >= CURRENT_DATE - INTERVAL '30 days'`;
  }

  query += ' GROUP BY created_at::date ORDER BY date ASC';

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get chart data error:', err);
    res.status(500).json({ error: err.message });
  }
});
// Laporan harian detail (per-hari dalam range atau 30 hari terakhir)
router.get('/daily-report', async (req, res) => {
  const { start, end } = req.query;
  let query = `SELECT created_at::date AS date, SUM(total_price) AS total, COUNT(*) AS order_count
    FROM orders WHERE payment_status = 'paid'`;
  const params = [];
  let paramIndex = 1;

  if (start && end) {
    query += ` AND created_at::date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
    params.push(start, end);
  } else {
    query += ` AND created_at >= CURRENT_DATE - INTERVAL '30 days'`;
  }

  query += ' GROUP BY created_at::date ORDER BY date DESC';

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get daily report error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Laporan bulanan (12 bulan terakhir)
router.get('/monthly-report', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        COUNT(*)::integer AS order_count,
        SUM(total_price) AS total
      FROM orders
      WHERE payment_status = 'paid'
        AND created_at >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Get monthly report error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
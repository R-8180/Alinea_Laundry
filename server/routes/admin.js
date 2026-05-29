const express = require('express');
const router = express.Router();
const db = require('../db'); // db is pg.Pool
const auth = require('../middleware/auth');
const { uploadImage, uploadDelivery, getFileUrl } = require('../utils/upload');
const { notifyAdmins } = require('../utils/notifications');
const { sendWebPush } = require('../utils/push');
const { adminLimiter } = require('../middleware/rateLimiter');
const { idParamValidation, updateStatusValidation, searchValidation, validate } = require('../utils/validators');

router.use(auth);
router.use(adminLimiter);
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
    // ⚠️ SAFETY: Auto-migrate to prevent "column does not exist" on Vercel
    try {
      await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_offline BOOLEAN DEFAULT FALSE`);
      await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255)`);
      await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50)`);
      await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof VARCHAR(255)`);
    } catch (e) { console.error('Migration error in GET /orders:', e); }

    const activeBranchId = req.user.branch_id || (req.query.branch_id ? parseInt(req.query.branch_id) : null);
    const queryParams = [];
    let queryStr = `
      SELECT o.*, 
             COALESCE(u.name, o.guest_name) AS customer_name, 
             COALESCE(u.phone, o.guest_phone) AS phone,
             c.name AS courier_name,
             p.payment_proof,
             b.name AS branch_name,
             (SELECT COUNT(*) FROM payments WHERE order_id = o.id AND validated = FALSE)::integer AS need_validation,
             (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
             (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
             (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
             (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
             (SELECT string_agg(DISTINCT service_type, ', ') FROM order_items WHERE order_id = o.id) AS service_types
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN users c ON o.courier_id = c.id
      LEFT JOIN payments p ON p.order_id = o.id
      LEFT JOIN branches b ON o.branch_id = b.id
    `;
    if (activeBranchId) {
      queryStr += ` WHERE o.branch_id = $1`;
      queryParams.push(activeBranchId);
    }
    queryStr += ` ORDER BY o.created_at DESC`;
    
    const result = await db.query(queryStr, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error('Get admin orders error:', err);
    res.status(500).json({ message: 'DB Error GET orders: ' + err.message });
  }
});

const crypto = require('crypto');

function generateOrderCode() {
  const d = new Date();
  const yymmdd = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `OFF-${yymmdd}-${rand}`;
}

const parseItems = (req, res, next) => {
  if (req.body.items && typeof req.body.items === 'string') {
    try { req.body.items = JSON.parse(req.body.items); } catch (e) {}
  }
  next();
};

router.post('/offline-order', uploadImage.fields([{name: 'photo'}, {name: 'payment_proof'}]), parseItems, async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // Safety check migration inside POST too
    try {
      await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_offline BOOLEAN DEFAULT FALSE`);
      await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_name VARCHAR(255)`);
      await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_phone VARCHAR(50)`);
      await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_proof VARCHAR(255)`);
    } catch (e) {}

    const { guest_name, guest_phone, notes, total_price, payment_status, items, service_id } = req.body;
    
    // Fallback if branch_id is empty string, make it null or use req.user.branch_id
    const branch_id = req.user.branch_id || (req.body.branch_id ? req.body.branch_id : null);
    
    const photo_url = req.files && req.files['photo'] ? getFileUrl(req.files['photo'][0]) : null;
    const payment_proof = req.files && req.files['payment_proof'] ? getFileUrl(req.files['payment_proof'][0]) : null;
    
    const orderCode = generateOrderCode();

    const parsedTotalPrice = Math.round(Number(total_price) || 0);
    const parsedBranchId = branch_id ? parseInt(branch_id, 10) : null;
    const parsedServiceId = service_id ? parseInt(service_id, 10) : null;

    // Ambil tipe kecepatan layanan (reguler/express) dari database
    let serviceSpeed = 'reguler';
    if (parsedServiceId) {
      const sRes = await client.query('SELECT type FROM services WHERE id = $1', [parsedServiceId]);
      if (sRes.rows.length > 0) {
        serviceSpeed = sRes.rows[0].type || 'reguler';
      }
    }

    // Status langsung cuci
    const orderRes = await client.query(
      `INSERT INTO orders 
      (user_id, order_code, status, total_price, payment_status, notes, photo_url, is_offline, guest_name, guest_phone, branch_id, payment_proof, service_speed)
      VALUES (NULL, $1, 'proses', $2, $3, $4, $5, true, $6, $7, $8, $9, $10) RETURNING id`,
      [orderCode, parsedTotalPrice, payment_status || 'lunas', notes, photo_url, guest_name, guest_phone, parsedBranchId, payment_proof, serviceSpeed]
    );
    const orderId = orderRes.rows[0].id;

    for (const item of items) {
      const weight = item.service_type === 'kiloan' ? parseFloat(item.qty) || 0 : 0;
      const qty_items = item.service_type === 'satuan' ? Math.round(Number(item.qty) || 0) : 0;
      const price_per_unit = Math.round(Number(item.price_per_unit) || 0);
      
      await client.query(
        `INSERT INTO order_items (order_id, service_id, service_type, name, weight, qty_items, price_per_unit)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, parsedServiceId, item.service_type, item.name, weight, qty_items, price_per_unit]
      );
    }
    
    await client.query('COMMIT');
    res.json({ message: 'Pesanan offline berhasil dibuat', order_code: orderCode, id: orderId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Offline order error:', error);
    res.status(500).json({ message: 'DB Error POST: ' + error.message });
  } finally {
    client.release();
  }
});

// GET detail order dengan alamat + info voucher
router.get('/orders/:id', idParamValidation, validate, async (req, res) => {
  const { id } = req.params;
  try {
    let queryStr = `
      SELECT o.*, 
             COALESCE(u.name, o.guest_name) AS customer_name, 
             COALESCE(u.address, 'Offline (Di Tempat)') AS customer_address, 
             COALESCE(u.phone, o.guest_phone) AS phone,
             COALESCE(o.payment_proof, p.payment_proof) AS payment_proof, p.created_at AS payment_date, p.validated AS payment_validated,
             b.name AS branch_name,
             (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
             (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
             (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
             (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
             (SELECT string_agg(DISTINCT service_type, ', ') FROM order_items WHERE order_id = o.id) AS service_types,
             (SELECT voucher_name FROM vouchers WHERE code = o.voucher_code LIMIT 1) AS voucher_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN payments p ON p.order_id = o.id
      LEFT JOIN branches b ON o.branch_id = b.id
      WHERE o.id = $1
    `;
    const queryParams = [id];
    if (req.user.branch_id) {
      queryStr += ` AND o.branch_id = $2`;
      queryParams.push(req.user.branch_id);
    }
    const orderRes = await db.query(queryStr, queryParams);

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
    const activeBranchId = req.user.branch_id || (req.query.branch_id ? parseInt(req.query.branch_id) : null);
    let queryStr = '';
    const queryParams = [];
    
    if (activeBranchId) {
      queryStr = `
        SELECT u.id, u.name, u.email, u.phone, u.created_at,
               COUNT(o.id)::integer AS total_orders,
               MAX(o.created_at) AS last_order_at
        FROM users u
        JOIN orders o ON o.user_id = u.id
        WHERE (u.role = 'customer' OR u.role IS NULL) AND o.branch_id = $1
        GROUP BY u.id
        ORDER BY last_order_at DESC, u.created_at DESC
      `;
      queryParams.push(activeBranchId);
    } else {
      queryStr = `
        SELECT u.id, u.name, u.email, u.phone, u.created_at,
               COUNT(o.id)::integer AS total_orders,
               MAX(o.created_at) AS last_order_at
        FROM users u
        LEFT JOIN orders o ON o.user_id = u.id
        WHERE u.role = 'customer' OR u.role IS NULL
        GROUP BY u.id
        ORDER BY last_order_at DESC, u.created_at DESC
      `;
    }
    const result = await db.query(queryStr, queryParams);
    res.json(result.rows);
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET alamat per customer
router.get('/customers/:id/addresses', idParamValidation, validate, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, label, address, note, is_primary FROM addresses WHERE user_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get customer addresses error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET riwayat order singkat per customer
router.get('/customers/:id/orders', idParamValidation, validate, async (req, res) => {
  const { id } = req.params;
  try {
    const activeBranchId = req.user.branch_id || (req.query.branch_id ? parseInt(req.query.branch_id) : null);
    let queryStr = `
      SELECT o.id, o.order_code, o.status, o.total_price, o.service_speed,
             o.payment_status, o.created_at, o.voucher_code, o.address
      FROM orders o
      WHERE o.user_id = $1
    `;
    const queryParams = [id];
    if (activeBranchId) {
      queryStr += ` AND o.branch_id = $2`;
      queryParams.push(activeBranchId);
    }
    queryStr += ` ORDER BY o.created_at DESC`;
    const result = await db.query(queryStr, queryParams);
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

    if (items.length > 0) {
      const insertValues = [];
      const valuePlaceholders = [];
      let paramIndex = 1;

      for (const item of items) {
        valuePlaceholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        insertValues.push(
          orderId,
          item.service_type || 'kiloan',
          item.name || '',
          item.notes || '',
          0,
          0,
          item.service_type === 'kiloan' ? 7000 : 5000,
          item.parfum || 'Random',
          0
        );
      }

      const bulkSql = `INSERT INTO order_items (order_id, service_type, name, notes, weight, qty_items, price_per_unit, parfum, parfum_price) VALUES ${valuePlaceholders.join(', ')}`;
      await client.query(bulkSql, insertValues);
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

  const activeBranchId = req.user.branch_id || (req.query.branch_id ? parseInt(req.query.branch_id) : null);
  const branchCondition = activeBranchId ? ` AND branch_id = $8` : '';
  const params = [today, yesterday, yesterday, today, yesterday, today, yesterday];
  if (activeBranchId) params.push(activeBranchId);

  try {
    const result = await db.query(
      `SELECT 
         (SELECT COUNT(*) FROM orders WHERE created_at::date = $1${branchCondition})::integer AS orders_today,
         (SELECT COUNT(*) FROM orders WHERE created_at::date = $2${branchCondition})::integer AS orders_yesterday,
         (SELECT COUNT(*) FROM orders WHERE status != 'selesai'${branchCondition})::integer AS active_today,
         (SELECT COUNT(*) FROM orders WHERE status != 'selesai' AND created_at::date = $3${branchCondition})::integer AS active_yesterday,
         (SELECT COUNT(*) FROM orders WHERE status = 'selesai' AND created_at::date = $4${branchCondition})::integer AS done_today,
         (SELECT COUNT(*) FROM orders WHERE status = 'selesai' AND created_at::date = $5${branchCondition})::integer AS done_yesterday,
         COALESCE((SELECT SUM(total_price) FROM orders WHERE payment_status = 'paid' AND created_at::date = $6${branchCondition}), 0)::integer AS revenue_today,
         COALESCE((SELECT SUM(total_price) FROM orders WHERE payment_status = 'paid' AND created_at::date = $7${branchCondition}), 0)::integer AS revenue_yesterday
      `,
      params
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Stats yesterday error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT assign kurir + estimasi + express_fee
router.put('/orders/:id/assign', idParamValidation, validate, async (req, res) => {
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
    
    // Get info BEFORE update
    const oldOrderInfo = await client.query('SELECT courier_id, order_code, user_id FROM orders WHERE id = $1', [orderId]);
    const oldCourierId = oldOrderInfo.rows[0]?.courier_id;
    const orderCode = oldOrderInfo.rows[0]?.order_code;
    const customerId = oldOrderInfo.rows[0]?.user_id;

    await client.query(sql, values);

    // Get service info for courier notification
    const serviceInfo = await client.query(`
      SELECT s.name, o.service_speed 
      FROM orders o 
      LEFT JOIN order_items oi ON oi.order_id = o.id 
      LEFT JOIN services s ON oi.service_id = s.id 
      WHERE o.id = $1 LIMIT 1
    `, [orderId]);
    const svc = serviceInfo.rows[0] || {};
    const layananStr = svc.name ? `${svc.name} ${svc.service_speed === 'express' ? 'Express' : 'Reguler'}` : 'Layanan';

    // Notify Courier
    if (courier_id !== undefined && courier_id !== null) {
      // Reassignment
      if (oldCourierId && oldCourierId !== courier_id) {
        await client.query(
          'INSERT INTO notifications (user_id, order_id, title, message) VALUES ($1, $2, $3, $4)',
          [oldCourierId, orderId, 'Pesanan Dialihkan', `Pesanan #${orderCode} telah dialihkan ke kurir lain.`]
        );
        sendWebPush(oldCourierId, {
          title: 'Pesanan Dialihkan',
          body: `Pesanan #${orderCode} telah dialihkan ke kurir lain.`,
          tag: `order-${orderId}`,
          url: '/courier'
        }).catch(e => console.error('Courier shift push error:', e));
      }
      // Assignment (New or Reassigned)
      await client.query(
        'INSERT INTO notifications (user_id, order_id, title, message) VALUES ($1, $2, $3, $4)',
        [courier_id, orderId, 'Penugasan Baru', `Kamu ditugaskan untuk pesanan #${orderCode} (${layananStr}).`]
      );
      sendWebPush(courier_id, {
        title: 'Penugasan Baru',
        body: `Kamu ditugaskan untuk pesanan #${orderCode} (${layananStr}).`,
        tag: `order-${orderId}`,
        url: '/courier'
      }).catch(e => console.error('Courier assignment push error:', e));
    } else if ((estimated_days !== undefined || estimated_hours !== undefined) && oldCourierId) {
      // Estimation update
      await client.query(
        'INSERT INTO notifications (user_id, order_id, title, message) VALUES ($1, $2, $3, $4)',
        [oldCourierId, orderId, 'Update Estimasi', `Admin telah memperbarui estimasi waktu untuk pesanan #${orderCode}.`]
      );
      sendWebPush(oldCourierId, {
        title: 'Update Estimasi',
        body: `Admin telah memperbarui estimasi waktu untuk pesanan #${orderCode}.`,
        tag: `order-${orderId}`,
        url: '/courier'
      }).catch(e => console.error('Courier estimation push error:', e));
    }

    // Notify Customer
    if (customerId) {
      let msg = `Estimasi pengerjaan pesanan Anda #${orderCode} telah diperbarui.`;
      if (courier_id) {
        const courierInfo = await client.query('SELECT name FROM users WHERE id = $1', [courier_id]);
        const courierName = courierInfo.rows[0]?.name || 'Kurir';
        msg = `Kurir ${courierName} telah ditugaskan untuk pesanan Anda #${orderCode}.`;
      }
      await client.query(
        'INSERT INTO notifications (user_id, order_id, title, message) VALUES ($1, $2, $3, $4)',
        [customerId, orderId, 'Update Pesanan', msg]
      );
      sendWebPush(customerId, {
        title: 'Update Pesanan',
        body: msg,
        tag: `order-${orderId}`,
        url: '/dashboard'
      }).catch(e => console.error('Customer assign update push error:', e));
    }

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

router.put('/orders/:id/reset-estimasi', idParamValidation, validate, async (req, res) => {
  const orderId = req.params.id;
  try {
    await db.query('UPDATE orders SET estimated_days = 0, estimated_hours = 0 WHERE id = $1', [orderId]);
    res.json({ message: 'Estimasi direset' });
  } catch (err) {
    console.error('Reset estimation error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/orders/:id/validate-items', idParamValidation, validate, async (req, res) => {
  const { items, express_fee, admin_note, additional_charge } = req.body;
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

    const total = Math.round(subtotal + (parseFloat(express_fee) || 0) + (parseInt(additional_charge) || 0));
    await client.query(
      'UPDATE orders SET total_price = $1, admin_note = $2, additional_charge = $3 WHERE id = $4',
      [total, admin_note || null, parseInt(additional_charge) || 0, orderId]
    );

    // Send payment notification to customer automatically
    const orderInfo = await client.query('SELECT user_id, order_code FROM orders WHERE id = $1', [orderId]);
    if (orderInfo.rows.length > 0 && orderInfo.rows[0].user_id) {
      const { user_id, order_code } = orderInfo.rows[0];
      const msg = `Pesanan Anda #${order_code} telah divalidasi oleh Admin. Total tagihan: Rp ${total.toLocaleString('id-ID')}. Silakan segera lakukan pembayaran.`;
      await client.query(
        'INSERT INTO notifications (user_id, order_id, title, message) VALUES ($1, $2, $3, $4)',
        [user_id, orderId, 'Menunggu Pembayaran', msg]
      );
      sendWebPush(user_id, {
        title: 'Menunggu Pembayaran',
        body: msg,
        tag: `order-${orderId}`,
        url: '/dashboard'
      }).catch(e => console.error('Validate items push error:', e));
    }

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
router.put('/orders/:id/status', updateStatusValidation, validate, async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  const allowedStatuses = ['menunggu', 'pickup', 'proses', 'antar', 'sedang_diantar', 'selesai', 'batal'];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Status tidak valid' });
  }

  try {
    const orderInfo = await db.query('SELECT user_id, order_code FROM orders WHERE id = $1', [orderId]);
    await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId]);
    
    if (orderInfo.rows.length > 0 && orderInfo.rows[0].user_id) {
      const { user_id, order_code } = orderInfo.rows[0];
      let msg = `Pesanan Anda #${order_code} sekarang berstatus: ${status.toUpperCase()}.`;
      let title = 'Update Status Pesanan';
      
      if (status === 'menunggu') {
        title = 'Menunggu Penjemputan';
        msg = `Laundry Anda #${order_code} sedang dalam antrean penjemputan oleh kurir kami. Mohon ditunggu ya!`;
      } else if (status === 'pickup') {
        title = 'Kurir Menuju Lokasi';
        msg = `Kurir sedang menuju lokasi Anda untuk menjemput laundry #${order_code}. Mohon bersiap ya!`;
      } else if (status === 'proses') {
        title = 'Laundry Sedang Diproses';
        msg = `Laundry Anda #${order_code} sudah tiba di outlet dan sedang diproses higienis oleh tim kami.`;
      } else if (status === 'antar') {
        title = 'Menunggu Pengantaran';
        msg = `Laundry Anda #${order_code} sudah selesai diproses bersih & wangi, dan sedang mengantre untuk diantarkan kembali.`;
      } else if (status === 'sedang_diantar') {
        title = 'Laundry Sedang Diantar';
        msg = `Kabar baik! Kurir sedang dalam perjalanan mengantarkan laundry wangi Anda #${order_code} kembali ke alamat tujuan. Siap-siap ya!`;
      } else if (status === 'selesai') {
        title = 'Laundry Selesai';
        msg = `Laundry Anda #${order_code} telah sukses diterima dengan bersih dan wangi. Terima kasih!`;
      } else if (status === 'batal') {
        title = 'Pesanan Dibatalkan';
        msg = `Pesanan Anda #${order_code} telah dibatalkan. Silakan hubungi admin jika terdapat kekeliruan.`;
      }
      
      await db.query(
        'INSERT INTO notifications (user_id, order_id, title, message) VALUES ($1, $2, $3, $4)',
        [user_id, orderId, title, msg]
      );
      sendWebPush(user_id, {
        title,
        body: msg,
        tag: `order-${orderId}`,
        url: '/dashboard'
      }).catch(e => console.error('Status update push error:', e));
    }

    if (status === 'selesai') {
      if (orderInfo.rows.length > 0 && orderInfo.rows[0].user_id) {
        await db.query('UPDATE users SET points = COALESCE(points, 0) + 10 WHERE id = $1', [orderInfo.rows[0].user_id]);
      }
      notifyAdmins(orderId, 'completed').catch(err => console.error('Admin notification error:', err));
    }
    
    res.json({ message: 'Status diupdate' });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT update payment status (for quick toggle)
router.put('/orders/:id/payment-status', idParamValidation, validate, async (req, res) => {
  const { id } = req.params;
  const { payment_status } = req.body;
  if (!['paid', 'pending'].includes(payment_status)) {
    return res.status(400).json({ message: 'Payment status tidak valid' });
  }
  try {
    await db.query('UPDATE orders SET payment_status = $1 WHERE id = $2', [payment_status, id]);
    res.json({ message: 'Status pembayaran diupdate' });
  } catch (err) {
    console.error('Update payment status error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT admin selesaikan pesanan + upload foto (opsional)
router.put('/orders/:id/complete', uploadDelivery.single('photo'), idParamValidation, validate, async (req, res) => {
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
    const orderInfo = await db.query('SELECT user_id, order_code FROM orders WHERE id = $1', [orderId]);
    const result = await db.query(sql, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }
    
    if (orderInfo.rows.length > 0 && orderInfo.rows[0].user_id) {
      const { user_id, order_code } = orderInfo.rows[0];
      await db.query('UPDATE users SET points = COALESCE(points, 0) + 10 WHERE id = $1', [user_id]);
      await db.query(
        'INSERT INTO notifications (user_id, order_id, title, message) VALUES ($1, $2, $3, $4)',
        [user_id, orderId, 'Pesanan Selesai', `Pesanan Anda #${order_code} telah selesai diproses oleh Admin. Terima kasih. (+10 Poin)`]
      );
      sendWebPush(user_id, {
        title: 'Pesanan Selesai',
        body: `Pesanan Anda #${order_code} telah selesai diproses oleh Admin. Terima kasih. (+10 Poin)`,

        tag: `order-${orderId}`,
        url: '/dashboard'
      }).catch(e => console.error('Complete order push error:', e));
    }

    // Notify admins that the order is completed
    notifyAdmins(orderId, 'completed').catch(err => console.error('Admin notification error:', err));
    
    res.json({ message: 'Pesanan berhasil diselesaikan', delivery_proof: photoUrl });
  } catch (err) {
    console.error('Complete order error:', err);
    return res.status(500).json({ error: err.message || 'Database error' });
  }
});

// PUT validasi pembayaran
router.put('/payments/validate/:id', idParamValidation, validate, async (req, res) => {
  const orderId = req.params.id;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE payments SET validated = true WHERE order_id = $1', [orderId]);
    await client.query('UPDATE orders SET payment_status = $1 WHERE id = $2', ['paid', orderId]);

    // Send payment confirmation notification to customer
    const orderInfo = await client.query('SELECT user_id, order_code FROM orders WHERE id = $1', [orderId]);
    if (orderInfo.rows.length > 0 && orderInfo.rows[0].user_id) {
      const { user_id, order_code } = orderInfo.rows[0];
      await client.query(
        'INSERT INTO notifications (user_id, order_id, title, message) VALUES ($1, $2, $3, $4)',
        [user_id, orderId, 'Pembayaran Diterima', `Pembayaran untuk pesanan Anda #${order_code} telah divalidasi dan diterima. Terima kasih!`]
      );
      sendWebPush(user_id, {
        title: 'Pembayaran Diterima',
        body: `Pembayaran untuk pesanan Anda #${order_code} telah divalidasi dan diterima. Terima kasih!`,

        tag: `order-${orderId}`,
        url: '/dashboard'
      }).catch(e => console.error('Validate payment push error:', e));
    }

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
  const activeBranchId = req.user.branch_id || (req.query.branch_id ? parseInt(req.query.branch_id) : null);
  
  let query = `SELECT 
    SUM(total_price) AS total_pendapatan, 
    COUNT(*) AS total_order 
    FROM orders WHERE payment_status = 'paid'`;
  const params = [];
  
  let finQuery = `SELECT type, SUM(amount) as total_amount FROM financial_records WHERE 1=1`;
  const finParams = [];
  
  let paramIndex = 1;
  let finParamIndex = 1;

  if (activeBranchId) {
    query += ` AND branch_id = $${paramIndex++}`;
    params.push(activeBranchId);
    
    finQuery += ` AND (branch_id = $${finParamIndex++} OR branch_id IS NULL)`;
    finParams.push(activeBranchId);
  }

  if (start && end) {
    query += ` AND created_at::date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
    params.push(start, end);
    
    finQuery += ` AND date BETWEEN $${finParamIndex++} AND $${finParamIndex++}`;
    finParams.push(start, end);
  } else if (year && month) {
    query += ` AND EXTRACT(YEAR FROM created_at) = $${paramIndex++} AND EXTRACT(MONTH FROM created_at) = $${paramIndex++}`;
    params.push(parseInt(year), parseInt(month));
    
    finQuery += ` AND EXTRACT(YEAR FROM date) = $${finParamIndex++} AND EXTRACT(MONTH FROM date) = $${finParamIndex++}`;
    finParams.push(parseInt(year), parseInt(month));
  } else if (year) {
    query += ` AND EXTRACT(YEAR FROM created_at) = $${paramIndex++}`;
    params.push(parseInt(year));
    
    finQuery += ` AND EXTRACT(YEAR FROM date) = $${finParamIndex++}`;
    finParams.push(parseInt(year));
  }
  
  finQuery += ` GROUP BY type`;

  try {
    const result = await db.query(query, params);
    const finResult = await db.query(finQuery, finParams);
    
    let manual_income = 0;
    let manual_expense = 0;
    let manual_debt = 0;
    
    finResult.rows.forEach(row => {
      if (row.type === 'pendapatan_lain') manual_income = parseInt(row.total_amount) || 0;
      if (row.type === 'pengeluaran') manual_expense = parseInt(row.total_amount) || 0;
      if (row.type === 'utang') manual_debt = parseInt(row.total_amount) || 0;
    });

    const ordersRevenue = parseInt(result.rows[0].total_pendapatan) || 0;
    
    res.json({
      total_order: parseInt(result.rows[0].total_order) || 0,
      orders_revenue: ordersRevenue,
      manual_income,
      manual_expense,
      manual_debt,
      net_revenue: (ordersRevenue + manual_income) - manual_expense
    });
  } catch (err) {
    console.error('Get financial stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Data grafik harian
router.get('/chart', async (req, res) => {
  const { start, end, year, month } = req.query;
  const activeBranchId = req.user.branch_id || (req.query.branch_id ? parseInt(req.query.branch_id) : null);
  
  let dateSelect = "created_at::date AS date";
  let groupBy = "created_at::date";
  
  if (year && !month) {
    dateSelect = "DATE_TRUNC('month', created_at)::date AS date";
    groupBy = "DATE_TRUNC('month', created_at)";
  }

  let query = `SELECT ${dateSelect}, SUM(total_price) AS total
    FROM orders WHERE payment_status = 'paid'`;
  const params = [];
  let paramIndex = 1;

  if (activeBranchId) {
    query += ` AND branch_id = $${paramIndex++}`;
    params.push(activeBranchId);
  }

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

  query += ` GROUP BY ${groupBy} ORDER BY date ASC`;

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
  const activeBranchId = req.user.branch_id || (req.query.branch_id ? parseInt(req.query.branch_id) : null);
  
  let query = `SELECT created_at::date AS date, SUM(total_price) AS total, COUNT(*) AS order_count
    FROM orders WHERE payment_status = 'paid'`;
  const params = [];
  let paramIndex = 1;

  if (activeBranchId) {
    query += ` AND branch_id = $${paramIndex++}`;
    params.push(activeBranchId);
  }

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
    const activeBranchId = req.user.branch_id || (req.query.branch_id ? parseInt(req.query.branch_id) : null);
    const params = [];
    let query = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') AS month,
        COUNT(*)::integer AS order_count,
        SUM(total_price) AS total
      FROM orders
      WHERE payment_status = 'paid'
        AND created_at >= CURRENT_DATE - INTERVAL '12 months'
    `;
    if (activeBranchId) {
      query += ` AND branch_id = $1`;
      params.push(activeBranchId);
    }
    query += `
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get monthly report error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET daftar kontak bantuan (admin cabang dan kurir)
router.get('/bantuan-directory', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, role, phone, branch_id FROM users WHERE role IN ('admin', 'courier') ORDER BY role ASC, name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get bantuan directory error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET top services (layanan terlaris)
router.get('/top-services', async (req, res) => {
  const activeBranchId = req.user.branch_id || (req.query.branch_id ? parseInt(req.query.branch_id) : null);
  let query = `
    SELECT oi.service_type, COUNT(oi.id) as total_sold
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.payment_status = 'paid'
  `;
  const params = [];
  if (activeBranchId) {
    query += ` AND o.branch_id = $1`;
    params.push(activeBranchId);
  }
  query += ` GROUP BY oi.service_type ORDER BY total_sold DESC LIMIT 5`;

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET top branches (cabang terlaris)
router.get('/top-branches', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT b.name as branch_name, SUM(o.total_price) as total_revenue
      FROM orders o
      JOIN branches b ON o.branch_id = b.id
      WHERE o.payment_status = 'paid'
      GROUP BY b.name
      ORDER BY total_revenue DESC
      LIMIT 5
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET manual transactions (catatan keuangan)
router.get('/transactions', async (req, res) => {
  const activeBranchId = req.user.branch_id || (req.query.branch_id ? parseInt(req.query.branch_id) : null);
  let query = `SELECT * FROM financial_records`;
  const params = [];
  if (activeBranchId) {
    query += ` WHERE branch_id = $1 OR branch_id IS NULL`;
    params.push(activeBranchId);
  }
  query += ` ORDER BY date DESC, created_at DESC`;

  try {
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST manual transaction
router.post('/transactions', async (req, res) => {
  const { type, category, amount, description, date, branch_id } = req.body;
  const activeBranchId = req.user.branch_id || (branch_id ? parseInt(branch_id) : null);
  
  try {
    const result = await db.query(
      `INSERT INTO financial_records (type, category, amount, description, date, branch_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [type, category, amount, description, date || new Date(), activeBranchId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE manual transaction
router.delete('/transactions/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM financial_records WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET voucher templates
router.get('/vouchers', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM voucher_templates ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST voucher templates
router.post('/vouchers', async (req, res) => {
  const { name, points_required, description, discount_amount } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO voucher_templates (name, points_required, description, discount_amount) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, parseInt(points_required), description, parseInt(discount_amount)]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT voucher templates
router.put('/vouchers/:id', async (req, res) => {
  const { name, points_required, description, discount_amount, is_active } = req.body;
  try {
    const result = await db.query(
      'UPDATE voucher_templates SET name = $1, points_required = $2, description = $3, discount_amount = $4, is_active = $5 WHERE id = $6 RETURNING *',
      [name, parseInt(points_required), description, parseInt(discount_amount), is_active, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE voucher templates
router.delete('/vouchers/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM voucher_templates WHERE id = $1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST send broadcast notification
router.post('/notifications/broadcast', async (req, res) => {
  const { message } = req.body;
  try {
    const users = await db.query("SELECT id FROM users WHERE role = 'customer' OR role IS NULL");
    for (const u of users.rows) {
      await db.query(
        'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
        [u.id, 'Pengumuman Admin', message]
      );
      // Fail silently for push if not configured
      try {
        sendWebPush(u.id, {
          title: 'Pengumuman Admin',
          body: message,
          tag: 'broadcast-admin',
          url: '/dashboard'
        });
      } catch (pushErr) {
        // ignore
      }
    }
    res.json({ message: 'Broadcast terkirim' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
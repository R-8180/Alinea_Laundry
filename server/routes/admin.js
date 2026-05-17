const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, 'complete-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(auth);
router.use((req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Akses ditolak' });
  next();
});

// GET semua order dengan badge perlu_validasi
router.get('/orders', (req, res) => {
  db.query(
    `SELECT o.*, u.name AS customer_name, u.phone AS phone,
            c.name AS courier_name,
            p.payment_proof,
            (SELECT COUNT(*) FROM payments WHERE order_id = o.id AND validated = FALSE) AS need_validation,
            (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
            (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
            (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
            (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
            (SELECT GROUP_CONCAT(DISTINCT service_type SEPARATOR ', ') FROM order_items WHERE order_id = o.id) AS service_types
     FROM orders o
     JOIN users u ON o.user_id = u.id
     LEFT JOIN users c ON o.courier_id = c.id
     LEFT JOIN payments p ON p.order_id = o.id
     ORDER BY o.created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// GET detail order dengan alamat + info voucher
router.get('/orders/:id', (req, res) => {
  const { id } = req.params;
  db.query(
    `SELECT o.*, u.name AS customer_name, u.address AS customer_address, u.phone AS phone,
            p.payment_proof, p.created_at AS payment_date, p.validated AS payment_validated,
            (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
            (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
            (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
            (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
            (SELECT GROUP_CONCAT(DISTINCT service_type SEPARATOR ', ') FROM order_items WHERE order_id = o.id) AS service_types
     FROM orders o
     JOIN users u ON o.user_id = u.id
     LEFT JOIN payments p ON p.order_id = o.id
     WHERE o.id = ?`,
    [id],
    (err, orderRes) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!orderRes.length) return res.status(404).json({ message: 'Tidak ditemukan' });
      db.query(`
        SELECT oi.*, 
               COALESCE(s.price_per_unit, oi.price_per_unit) AS current_price 
        FROM order_items oi 
        LEFT JOIN services s ON oi.service_id = s.id 
        WHERE oi.order_id = ?
      `, [id], (err, items) => {
        if (err) return res.status(500).json({ error: err.message });
        const updatedItems = items.map(i => {
          const { current_price, ...rest } = i;
          return { ...rest, price_per_unit: current_price };
        });
        res.json({ ...orderRes[0], items: updatedItems });
      });
    }
  );
});

// GET daftar semua customer + total order + last order
router.get('/customers', (req, res) => {
  db.query(
    `SELECT u.id, u.name, u.email, u.phone, u.created_at,
            COUNT(o.id) AS total_orders,
            MAX(o.created_at) AS last_order_at
     FROM users u
     LEFT JOIN orders o ON o.user_id = u.id
     WHERE u.role = 'customer' OR u.role IS NULL
     GROUP BY u.id
     ORDER BY last_order_at DESC, u.created_at DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// GET riwayat order singkat per customer
router.get('/customers/:id/orders', (req, res) => {
  const { id } = req.params;
  db.query(
    `SELECT o.id, o.order_code, o.status, o.total_price, o.service_speed,
            o.payment_status, o.created_at, o.voucher_code, o.address
     FROM orders o
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`,
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// POST buat order baru atas nama customer (oleh admin)
router.post('/orders/create', (req, res) => {
  const { customer_id, address, notes, service_speed, items } = req.body;
  if (!customer_id || !address || !items || items.length === 0) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }

  const crypto = require('crypto');
  const d = new Date();
  const yymmdd = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  const orderCode = `ORD-${yymmdd}-${rand}`;

  db.query(
    'INSERT INTO orders (user_id, order_code, address, notes, service_speed) VALUES (?, ?, ?, ?, ?)',
    [customer_id, orderCode, address, notes || '', service_speed || 'reguler'],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      const orderId = result.insertId;
      const itemValues = items.map(item => [
        orderId, item.service_type || 'kiloan', item.name || '', item.notes || '',
        0, 0,
        item.service_type === 'kiloan' ? 7000 : 5000,
        item.parfum || 'Random', 0
      ]);
      db.query(
        `INSERT INTO order_items (order_id, service_type, name, notes, weight, qty_items, price_per_unit, parfum, parfum_price) VALUES ?`,
        [itemValues],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ message: 'Order berhasil dibuat', order_code: orderCode, id: orderId });
        }
      );
    }
  );
});

// GET statistik kemarin (untuk persentase perubahan)
router.get('/stats/yesterday', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  db.query(
    `SELECT 
       (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = ?) AS orders_today,
       (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = ?) AS orders_yesterday,
       (SELECT COUNT(*) FROM orders WHERE status != 'selesai') AS active_today,
       (SELECT COUNT(*) FROM orders WHERE status != 'selesai' AND DATE(created_at) = ?) AS active_yesterday,
       (SELECT COUNT(*) FROM orders WHERE status = 'selesai' AND DATE(created_at) = ?) AS done_today,
       (SELECT COUNT(*) FROM orders WHERE status = 'selesai' AND DATE(created_at) = ?) AS done_yesterday,
       (SELECT COALESCE(SUM(total_price),0) FROM orders WHERE payment_status = 'paid' AND DATE(created_at) = ?) AS revenue_today,
       (SELECT COALESCE(SUM(total_price),0) FROM orders WHERE payment_status = 'paid' AND DATE(created_at) = ?) AS revenue_yesterday
    `,
    [today, yesterday, yesterday, today, yesterday, today, yesterday],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results[0]);
    }
  );
});

// PUT assign kurir + estimasi + express_fee
router.put('/orders/:id/assign', (req, res) => {
  const { courier_id, estimated_days, estimated_hours, express_fee } = req.body;
  const orderId = req.params.id;

  const updates = [];
  const values = [];

  if (courier_id !== undefined && courier_id !== null) {
    updates.push('courier_id = ?');
    values.push(courier_id);
  }
  if (estimated_days !== undefined && estimated_days !== null) {
    updates.push('estimated_days = ?');
    values.push(parseInt(estimated_days) || 0);
  }
  if (estimated_hours !== undefined && estimated_hours !== null) {
    updates.push('estimated_hours = ?');
    values.push(parseInt(estimated_hours) || 0);
  }
  if (express_fee !== undefined && express_fee !== null) {
    updates.push('express_fee = ?');
    values.push(express_fee);
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'Tidak ada data yang dikirim' });
  }

  if (estimated_days !== undefined || estimated_hours !== undefined) {
    updates.push(`estimated_start = NOW()`);
  }

  values.push(orderId);
  const sql = `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`;

  db.query(sql, values, (err) => {
    if (err) return res.status(500).json({ error: err.message });

    if (express_fee !== undefined) {
      db.query('SELECT * FROM order_items WHERE order_id = ?', [orderId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        let subtotal = 0;
        rows.forEach(item => subtotal += item.service_type === 'kiloan' ? (item.weight || 0) * (item.price_per_unit || 7000) : (item.qty_items || 0) * (item.price_per_unit || 5000));
        const total = subtotal + (express_fee || 0);
        db.query('UPDATE orders SET total_price = ? WHERE id = ?', [total, orderId], (err) => {
          if (err) return res.status(500).json({ error: err.message });
          db.query('SELECT estimated_start FROM orders WHERE id = ?', [orderId], (err, r) => {
            res.json({ message: 'Data diperbarui', total, estimated_start: r?.[0]?.estimated_start || null });
          });
        });
      });
    } else {
      db.query('SELECT estimated_start FROM orders WHERE id = ?', [orderId], (err, r) => {
        res.json({ message: 'Data diperbarui', estimated_start: r?.[0]?.estimated_start || null });
      });
    }
  });
});

router.put('/orders/:id/reset-estimasi', (req, res) => {
  const orderId = req.params.id;
  db.query('UPDATE orders SET estimated_days = 0, estimated_hours = 0 WHERE id = ?', [orderId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Estimasi direset' });
  });
});

router.put('/orders/:id/validate-items', (req, res) => {
  const { items, express_fee, admin_note } = req.body;
  const orderId = req.params.id;

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: err.message });

    let completed = 0;
    const validItems = items.filter(i => i.item_id);
    if (validItems.length === 0) calculateTotal();

    validItems.forEach(item => {
      // Jika admin set manual price, gunakan itu
      if (item.manual_price !== undefined) {
        const isKiloan = item.weight !== undefined;
        const field = isKiloan ? 'weight' : 'qty_items';
        const value = isKiloan ? item.weight : (item.qty || 1);
        
        db.query(`UPDATE order_items SET price_per_unit = ?, ${field} = ? WHERE id = ? AND order_id = ?`,
          [item.manual_price, value, item.item_id, orderId], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
            completed++;
            if (completed === validItems.length) calculateTotal();
          });
      } else {
        // Jika ada service_id, ambil harga dari services table
        db.query('SELECT service_id FROM order_items WHERE id = ?', [item.item_id], (err, itemResult) => {
          if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
          
          const serviceId = itemResult[0]?.service_id;
          
          if (serviceId) {
            // Ambil harga dari services
            db.query('SELECT price_per_unit FROM services WHERE id = ?', [serviceId], (err, serviceResult) => {
              if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
              const servicePrice = serviceResult[0]?.price_per_unit || (item.weight !== undefined ? 7000 : 5000);
              const field = item.weight !== undefined ? 'weight' : 'qty_items';
              const value = item.weight !== undefined ? item.weight : item.qty;
              
              db.query(
                `UPDATE order_items SET ${field} = ?, price_per_unit = ? WHERE id = ? AND order_id = ?`,
                [value, servicePrice, item.item_id, orderId], 
                (err) => {
                  if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                  completed++;
                  if (completed === validItems.length) calculateTotal();
                }
              );
            });
          } else {
            // Fallback ke harga lama jika tidak ada service_id
            const field = item.weight !== undefined ? 'weight' : 'qty_items';
            const value = item.weight !== undefined ? item.weight : item.qty;
            db.query(`UPDATE order_items SET ${field} = ? WHERE id = ? AND order_id = ?`,
              [value, item.item_id, orderId], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                completed++;
                if (completed === validItems.length) calculateTotal();
              });
          }
        });
      }
    });

    function calculateTotal() {
      db.query('SELECT * FROM order_items WHERE order_id = ?', [orderId], (err, rows) => {
        if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
        
        let subtotal = 0;
        rows.forEach(item => {
          const price = item.price_per_unit || (item.service_type === 'kiloan' ? 7000 : 5000);
          if (item.service_type === 'kiloan' || (item.weight > 0 && !item.qty_items)) {
            subtotal += (item.weight || 0) * price;
          } else {
            subtotal += (item.qty_items || 0) * price;
          }
        });

        const total = subtotal + (express_fee || 0);
        db.query('UPDATE orders SET total_price = ?, admin_note = ? WHERE id = ?', [total, admin_note || null, orderId], (err) => {
          if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
          db.commit(err => {
            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
            res.json({ message: 'Item divalidasi', total });
          });
        });
      });
    }
  });
});

// PUT update status
router.put('/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;

  const allowedStatuses = ['menunggu', 'pickup', 'cuci', 'antar', 'selesai', 'batal'];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: 'Status tidak valid' });
  }

  db.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Status diupdate' });
  });
});

// PUT admin selesaikan pesanan + upload foto (opsional)
router.put('/orders/:id/complete', upload.single('photo'), (req, res) => {
  const orderId = req.params.id;
  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const updates = ['status = "selesai"'];
  const values = [];

  if (photoUrl) {
    updates.push('delivery_proof = ?');
    values.push(photoUrl);
  }
  values.push(orderId);

  db.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, values, (err, result) => {
    if (err) {
      console.error('Complete order error:', err);
      return res.status(500).json({ error: err.message || 'Database error' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Order tidak ditemukan' });
    }
    res.json({ message: 'Pesanan berhasil diselesaikan', delivery_proof: photoUrl });
  });
});

// PUT validasi pembayaran
router.put('/payments/validate/:orderId', (req, res) => {
  const { orderId } = req.params;
  db.query('UPDATE payments SET validated = true WHERE order_id = ?', [orderId], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    db.query('UPDATE orders SET payment_status = "paid" WHERE id = ?', [orderId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Pembayaran divalidasi' });
    });
  });
});

// GET keuangan
router.get('/financial', (req, res) => {
  const { start, end, year, month } = req.query;
  let query = `SELECT 
    SUM(total_price) AS total_pendapatan, 
    COUNT(*) AS total_order 
    FROM orders WHERE payment_status = 'paid'`;
  const params = [];

  if (start && end) {
    query += ' AND DATE(created_at) BETWEEN ? AND ?';
    params.push(start, end);
  } else if (year && month) {
    query += ' AND YEAR(created_at) = ? AND MONTH(created_at) = ?';
    params.push(parseInt(year), parseInt(month));
  } else if (year) {
    query += ' AND YEAR(created_at) = ?';
    params.push(parseInt(year));
  }

  db.query(query, params, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(result[0]);
  });
});

// Data grafik harian
router.get('/chart', (req, res) => {
  const { start, end, year, month } = req.query;
  let query = `SELECT DATE(created_at) AS date, SUM(total_price) AS total
    FROM orders WHERE payment_status = 'paid'`;
  const params = [];

  if (start && end) {
    query += ' AND DATE(created_at) BETWEEN ? AND ?';
    params.push(start, end);
  } else if (year && month) {
    query += ' AND YEAR(created_at) = ? AND MONTH(created_at) = ?';
    params.push(parseInt(year), parseInt(month));
  } else if (year) {
    query += ' AND YEAR(created_at) = ?';
    params.push(parseInt(year));
  } else {
    query += ' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
  }

  query += ' GROUP BY DATE(created_at) ORDER BY date ASC';

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
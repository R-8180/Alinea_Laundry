const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, 'order-' + Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

function generateOrderCode() {
  const d = new Date();
  const yymmdd = `${String(d.getFullYear()).slice(-2)}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ORD-${yymmdd}-${rand}`;
}

// POST – Buat order dengan voucher dan service_id
router.post('/', auth, upload.single('photo'), (req, res) => {
  if (req.user.role !== 'customer') return res.status(403).json({ message: 'Hanya customer' });

  let items;
  try { items = JSON.parse(req.body.items); } catch { items = req.body.items; }
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Minimal satu item' });

  const userId = req.user.id;
  const address_id = req.body.address_id || null;
  const notes = req.body.notes || '';
  const service_speed = req.body.service_speed || 'reguler';
  const service_id = req.body.service_id || null; // NEW: service ID dari pilihan user
  const voucher_code = req.body.voucher_code || null;
  const photo_url = req.file ? `/uploads/${req.file.filename}` : null;
  const orderCode = generateOrderCode();

  const getAddress = (cb) => {
    if (address_id) {
      db.query('SELECT address FROM addresses WHERE id = ? AND user_id = ?', [address_id, userId], (err, res) => {
        if (err) return cb(err);
        if (res.length === 0) return cb('Alamat tidak ditemukan');
        cb(null, res[0].address);
      });
    } else cb(null, req.body.address || '');
  };

  getAddress((err, addressText) => {
    if (err) return res.status(400).json({ message: err });

    db.beginTransaction(err => {
      if (err) return res.status(500).json({ error: err.message });

      // Fetch service estimation times and real price
      db.query('SELECT price_per_unit, time_days, time_hours FROM services WHERE id = ?', [service_id], (err, sresults) => {
        if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
        const estDays = sresults.length > 0 ? sresults[0].time_days : 0;
        const estHours = sresults.length > 0 ? sresults[0].time_hours : 0;
        const realPrice = sresults.length > 0 ? sresults[0].price_per_unit : null;

        if (voucher_code) {
          db.query('SELECT * FROM vouchers WHERE code = ? AND user_id = ? AND used = FALSE', [voucher_code, userId], (err, vresults) => {
            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
            if (vresults.length === 0) return db.rollback(() => res.status(400).json({ message: 'Voucher tidak valid' }));
            db.query('UPDATE vouchers SET used = TRUE WHERE code = ?', [voucher_code], (err) => {
              if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
              insertOrder(100, estDays, estHours);
            });
          });
        } else {
          insertOrder(0, estDays, estHours);
        }

        function insertOrder(discount, days, hours) {
        db.query(
          'INSERT INTO orders (user_id, order_code, address, address_id, notes, photo_url, service_speed, voucher_code, discount, estimated_days, estimated_hours, estimated_start) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
          [userId, orderCode, addressText, address_id, notes, photo_url, service_speed, voucher_code, discount, days, hours],
          (err, result) => {
            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

            const orderId = result.insertId;
            // NEW: Tambah service_id ke item values (fallback ke harga lama kalau service_id null)
            const itemValues = items.map(item => [
              orderId, 
              service_id || null, // service_id
              item.service_type, 
              item.name || '', 
              item.notes || '',
              0, 0,
              realPrice !== null ? realPrice : (item.service_type === 'kiloan' ? 7000 : 5000), // real price from service
              item.parfum || '', 0
            ]);

            db.query(
              `INSERT INTO order_items (order_id, service_id, service_type, name, notes, weight, qty_items, price_per_unit, parfum, parfum_price) VALUES ?`,
              [itemValues],
              (err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                db.query('UPDATE users SET points = points + 10 WHERE id = ?', [userId]);
                db.commit(err => {
                  if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                  res.json({ message: 'Order berhasil', order_code: orderCode, id: orderId });
                });
              }
            );
          }
        );
      }
      });
    });
  });
});

// GET – Semua order customer
// GET – Semua order customer
// GET – Semua order customer
router.get('/', auth, (req, res) => {
  if (req.user.role !== 'customer') return res.status(403).json({ message: 'Hanya customer' });
  db.query(
    `SELECT o.*, u.name AS courier_name, p.payment_proof,
            (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
            (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
            (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
            (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
            (SELECT GROUP_CONCAT(DISTINCT service_type SEPARATOR ', ') FROM order_items WHERE order_id = o.id) AS service_types
     FROM orders o
     LEFT JOIN users u ON o.courier_id = u.id
     LEFT JOIN payments p ON p.order_id = o.id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// GET – Detail order (customer)
router.get('/:id', auth, (req, res) => {
  const orderId = req.params.id;
  db.query(
    `SELECT o.*, u.name AS courier_name, u.phone AS courier_phone,
            p.payment_proof, p.created_at AS payment_date,
            (SELECT s.name FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_name,
            (SELECT s.category FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_category,
            (SELECT s.time_days FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_days,
            (SELECT s.time_hours FROM order_items oi JOIN services s ON oi.service_id = s.id WHERE oi.order_id = o.id LIMIT 1) AS service_time_hours,
            (SELECT GROUP_CONCAT(DISTINCT service_type SEPARATOR ', ') FROM order_items WHERE order_id = o.id) AS service_types
     FROM orders o
     LEFT JOIN users u ON o.courier_id = u.id
     LEFT JOIN payments p ON p.order_id = o.id
     WHERE o.id = ? AND o.user_id = ?`,
    [orderId, req.user.id],
    (err, orderRes) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!orderRes[0]) return res.status(404).json({ message: 'Order tidak ditemukan' });

      db.query('SELECT * FROM order_items WHERE order_id = ?', [orderId], (err, items) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ ...orderRes[0], items });
      });
    }
  );
});

// PUT – Tandai selesai (selesai)
// PUT – Tandai pesanan selesai (customer)
router.put('/:id/complete', auth, (req, res) => {
  if (req.user.role !== 'customer') return res.status(403).json({ message: 'Hanya customer' });
  const orderId = req.params.id;
  db.query(
    'UPDATE orders SET status = "selesai" WHERE id = ? AND user_id = ?',
    [orderId, req.user.id],
    (err) => {
      if (err) {
        console.error('Error completing order:', err);
        return res.status(500).json({ error: err.message });
      }
      // Tambah 10 poin
      db.query('UPDATE users SET points = points + 10 WHERE id = ?', [req.user.id]);
      res.json({ message: 'Pesanan selesai, poin bertambah' });
    }
  );
});

// PUT – Batalkan pesanan (customer)
router.put('/:id/cancel', auth, (req, res) => {
  if (req.user.role !== 'customer') return res.status(403).json({ message: 'Hanya customer' });
  const orderId = req.params.id;
  
  // Hanya bisa batalkan jika status 'menunggu'
  db.query(
    'UPDATE orders SET status = "batal" WHERE id = ? AND user_id = ? AND status = "menunggu"',
    [orderId, req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      
      if (result.affectedRows === 0) {
        return res.status(400).json({ message: 'Pesanan tidak ditemukan atau tidak bisa dibatalkan (sudah diproses)' });
      }
      
      res.json({ message: 'Pesanan berhasil dibatalkan' });
    }
  );
});

// ========== VOUCHER (LOGIKA SIMPLE: HANYA PAKAI KOLOM discount) ==========

// GET – Cek status klaim voucher
router.get('/voucher/status', auth, (req, res) => {
  const userId = req.user.id;
  db.query(
    `SELECT COUNT(*) AS ready FROM orders WHERE user_id = ? AND status = 'selesai' AND discount = 0`,
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      const readyOrders = results[0].ready;
      const canClaim = readyOrders >= 5;
      const need = canClaim ? 0 : 5 - readyOrders;
      res.json({ canClaim, need });
    }
  );
});

// POST – Klaim voucher
router.post('/voucher/claim', auth, (req, res) => {
  const userId = req.user.id;
  // Cek apakah user punya minimal 5 order delivered yang belum ditandai
  db.query(
    `SELECT COUNT(*) AS ready FROM orders WHERE user_id = ? AND status = 'selesai' AND discount = 0`,
    [userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results[0].ready < 5) {
        return res.status(400).json({ message: 'Minimal 5 order selesai untuk klaim voucher' });
      }

      // Tandai 5 order tertua yang eligible
      db.query(
        `UPDATE orders SET discount = 1 WHERE user_id = ? AND status = 'selesai' AND discount = 0 ORDER BY created_at ASC LIMIT 5`,
        [userId],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          // Buat kode voucher baru
          const code = 'VOC-' + Math.random().toString(36).substring(2, 8).toUpperCase();
          db.query('INSERT INTO vouchers (user_id, code) VALUES (?, ?)', [userId, code], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Voucher berhasil diklaim', code });
          });
        }
      );
    }
  );
});

// GET – Daftar voucher yang bisa dipakai
router.get('/voucher/list', auth, (req, res) => {
  const userId = req.user.id;
  db.query('SELECT * FROM vouchers WHERE user_id = ? AND used = FALSE', [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
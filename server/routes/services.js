const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET semua layanan (public - untuk customer order form)
router.get('/', (req, res) => {
  db.query(
    `SELECT * FROM services WHERE is_active = 1 ORDER BY 
     FIELD(category, 'cuci_setrika', 'cuci_lipat', 'satuan'), 
     FIELD(type, 'reguler', 'express'),
     time_days DESC, time_hours DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// GET layanan by category
router.get('/category/:category', (req, res) => {
  const { category } = req.params;
  db.query(
    'SELECT * FROM services WHERE category = ? AND is_active = 1 ORDER BY time_days DESC, time_hours DESC',
    [category],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// GET single service
router.get('/:id', (req, res) => {
  db.query('SELECT * FROM services WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!results.length) return res.status(404).json({ message: 'Layanan tidak ditemukan' });
    res.json(results[0]);
  });
});

// === ADMIN ROUTES (Protected) ===
router.use(auth);
router.use((req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Akses ditolak' });
  next();
});

// GET all services (including inactive) - Admin only
router.get('/admin/all', (req, res) => {
  db.query(
    `SELECT * FROM services ORDER BY 
     FIELD(category, 'cuci_setrika', 'cuci_lipat', 'satuan'),
     is_active DESC,
     FIELD(type, 'reguler', 'express'),
     time_days DESC, time_hours DESC`,
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// POST create new service
router.post('/', (req, res) => {
  const { category, name, price, unit, time_days, time_hours, type } = req.body;
  
  if (!category || !name || !price || !unit) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }

  db.query(
    `INSERT INTO services (category, name, price_per_unit, unit, time_days, time_hours, type) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [category, name, price, unit, time_days || 0, time_hours || 0, type || 'reguler'],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ 
        message: 'Layanan berhasil ditambahkan', 
        id: result.insertId 
      });
    }
  );
});

// PUT update service
router.put('/:id', (req, res) => {
  const { name, price, unit, time_days, time_hours, type, is_active } = req.body;
  const serviceId = req.params.id;

  const updates = [];
  const values = [];

  if (name !== undefined) { updates.push('name = ?'); values.push(name); }
  if (price !== undefined) { updates.push('price_per_unit = ?'); values.push(price); }
  if (unit !== undefined) { updates.push('unit = ?'); values.push(unit); }
  if (time_days !== undefined) { updates.push('time_days = ?'); values.push(time_days); }
  if (time_hours !== undefined) { updates.push('time_hours = ?'); values.push(time_hours); }
  if (type !== undefined) { updates.push('type = ?'); values.push(type); }
  if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'Tidak ada data yang diupdate' });
  }

  values.push(serviceId);
  const sql = `UPDATE services SET ${updates.join(', ')} WHERE id = ?`;

  db.query(sql, values, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Layanan tidak ditemukan' });
    }
    res.json({ message: 'Layanan berhasil diupdate' });
  });
});

// DELETE soft delete service (set is_active = 0)
router.delete('/:id', (req, res) => {
  db.query(
    'UPDATE services SET is_active = 0 WHERE id = ?',
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Layanan tidak ditemukan' });
      }
      res.json({ message: 'Layanan berhasil dinonaktifkan' });
    }
  );
});

// PUT reactivate service
router.put('/:id/activate', (req, res) => {
  db.query(
    'UPDATE services SET is_active = 1 WHERE id = ?',
    [req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Layanan tidak ditemukan' });
      }
      res.json({ message: 'Layanan berhasil diaktifkan kembali' });
    }
  );
});

module.exports = router;
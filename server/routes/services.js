const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM services WHERE is_active = true ORDER BY time_days DESC, time_hours DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/category/:category', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services WHERE category = $1 AND is_active = true ORDER BY time_days DESC, time_hours DESC', [req.params.category]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM services WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Layanan tidak ditemukan' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use(auth);
router.use((req, res, next) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Akses ditolak' });
  next();
});

router.get('/admin/all', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM services ORDER BY is_active DESC, time_days DESC, time_hours DESC`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { category, name, price, unit, time_days, time_hours, type } = req.body;
  if (!category || !name || !price || !unit) return res.status(400).json({ message: 'Data tidak lengkap' });

  try {
    const result = await pool.query(
      `INSERT INTO services (category, name, price_per_unit, unit_type, time_days, time_hours, type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [category, name, price, unit, time_days || 0, time_hours || 0, type || 'reguler']
    );
    res.json({ message: 'Layanan berhasil ditambahkan', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { name, price, unit, time_days, time_hours, type, is_active } = req.body;
  const updates = [];
  const values = [];
  let index = 1;

  if (name !== undefined) { updates.push(`name = $${index++}`); values.push(name); }
  if (price !== undefined) { updates.push(`price_per_unit = $${index++}`); values.push(price); }
  if (unit !== undefined) { updates.push(`unit_type = $${index++}`); values.push(unit); }
  if (time_days !== undefined) { updates.push(`time_days = $${index++}`); values.push(time_days); }
  if (time_hours !== undefined) { updates.push(`time_hours = $${index++}`); values.push(time_hours); }
  if (type !== undefined) { updates.push(`type = $${index++}`); values.push(type); }
  if (is_active !== undefined) { updates.push(`is_active = $${index++}`); values.push(is_active); }

  if (updates.length === 0) return res.status(400).json({ message: 'Tidak ada data yang diupdate' });

  values.push(req.params.id);
  const sql = `UPDATE services SET ${updates.join(', ')} WHERE id = $${index}`;

  try {
    const result = await pool.query(sql, values);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Layanan tidak ditemukan' });
    res.json({ message: 'Layanan berhasil diupdate' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query('UPDATE services SET is_active = false WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Layanan tidak ditemukan' });
    res.json({ message: 'Layanan berhasil dinonaktifkan' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id/activate', async (req, res) => {
  try {
    const result = await pool.query('UPDATE services SET is_active = true WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Layanan tidak ditemukan' });
    res.json({ message: 'Layanan diaktifkan kembali' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
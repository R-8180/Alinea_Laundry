const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { addressValidation, validate } = require('../utils/validators');

router.use(auth);
router.use((req, res, next) => {
  if (req.user.role !== 'customer') return res.status(403).json({ message: 'Hanya customer' });
  next();
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', addressValidation, validate, async (req, res) => {
  const { label, address, lat, lng } = req.body;
  if (!address || address.trim() === '') {
    return res.status(400).json({ message: 'Alamat wajib diisi' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO addresses (user_id, label, address, lat, lng) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [req.user.id, label || '', address, lat || null, lng || null]
    );
    res.json({ message: 'Alamat ditambahkan', id: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', addressValidation, validate, async (req, res) => {
  const { label, address, lat, lng } = req.body;
  try {
    await pool.query(
      'UPDATE addresses SET label=$1, address=$2, lat=$3, lng=$4 WHERE id=$5 AND user_id=$6',
      [label || '', address, lat || null, lng || null, req.params.id, req.user.id]
    );
    res.json({ message: 'Alamat diperbarui' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Alamat dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
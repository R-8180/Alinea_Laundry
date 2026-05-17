const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);
router.use((req, res, next) => {
  if (req.user.role !== 'customer') return res.status(403).json({ message: 'Hanya customer' });
  next();
});

// GET – semua alamat user
router.get('/', (req, res) => {
  db.query(
    'SELECT * FROM addresses WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(results);
    }
  );
});

// POST – tambah alamat
router.post('/', (req, res) => {
  const { label, address, lat, lng } = req.body;
  if (!address || address.trim() === '') {
    return res.status(400).json({ message: 'Alamat wajib diisi' });
  }
  db.query(
    'INSERT INTO addresses (user_id, label, address, lat, lng) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, label || '', address, lat || null, lng || null],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Alamat ditambahkan', id: result.insertId });
    }
  );
});

// PUT – edit alamat
router.put('/:id', (req, res) => {
  const { label, address, lat, lng } = req.body;
  const addrId = req.params.id;
  db.query(
    'UPDATE addresses SET label=?, address=?, lat=?, lng=? WHERE id=? AND user_id=?',
    [label || '', address, lat || null, lng || null, addrId, req.user.id],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Alamat diperbarui' });
    }
  );
});

// DELETE – hapus alamat
router.delete('/:id', (req, res) => {
  db.query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Alamat dihapus' });
  });
});

module.exports = router;
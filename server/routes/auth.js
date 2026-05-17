const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SECRET = 'alinea-secret-key';

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, address, phone, lat, lng, is_primary } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (name, email, password, role, address, phone) VALUES (?,?,?,?,?,?)',
      [name, email, hash, 'customer', address || '', phone],
      (err, result) => {
        if (err) return res.status(400).json({ error: err.message });
        const userId = result.insertId;

        // Jika user mengisi alamat, simpan ke tabel addresses
        if (address && address.trim() !== '') {
          db.query(
            'INSERT INTO addresses (user_id, label, address, lat, lng, is_primary) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, 'Rumah', address, lat || null, lng || null, is_primary || false],
            (err2) => {
              if (err2) console.error('Gagal simpan alamat:', err2.message);
              // tidak menghentikan registrasi
            }
          );
        }
        res.json({ message: 'Registrasi berhasil' });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ message: 'Email tidak ditemukan' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Password salah' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      SECRET,
      { expiresIn: '1d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
  });
});

const authMiddleware = require('../middleware/auth');

router.get('/me', authMiddleware, (req, res) => {
  db.query('SELECT id, name, email, role, points, address, phone FROM users WHERE id = ?', [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json(results[0]);
  });
});

module.exports = router;
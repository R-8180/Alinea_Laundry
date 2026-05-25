const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { registerValidation, loginValidation, validate } = require('../utils/validators');
const authMiddleware = require('../middleware/auth');

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be defined');
}

const SECRET = process.env.JWT_SECRET;

// Register
router.post('/register', registerValidation, validate, async (req, res) => {
  const { name, email, password, address, address_note, phone, lat, lng, is_primary } = req.body;
  
  try {
    const checkEmail = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ message: 'Email sudah terdaftar' });
    }

    // Cek apakah nomor WA sudah digunakan oleh akun lain (hanya jika nomor diisi)
    if (phone && phone.trim() !== '') {
      const checkPhone = await pool.query(
        'SELECT id FROM users WHERE phone = $1',
        [phone]
      );
      
      if (checkPhone.rows.length > 0) {
        return res.status(400).json({ message: 'Nomor WhatsApp sudah digunakan oleh akun lain! ❌' });
      }
    }
    
    // Hash password 12 rounds
    const hash = await bcrypt.hash(password, 12);
    
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role, address, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [name, email, hash, 'customer', address || '', phone || null]
    );
    
    const userId = result.rows[0].id;
    
    if (address && address.trim() !== '') {
      await pool.query(
        'INSERT INTO addresses (user_id, label, address, note, lat, lng, is_primary) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [userId, 'Rumah', address, address_note || '', lat || null, lng || null, is_primary || false]
      );
    }
    
    res.status(201).json({ message: 'Registrasi berhasil' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', loginValidation, validate, async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const result = await pool.query(
      'SELECT id, email, password, role, name, phone, branch_id FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }
    
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    
    if (!match) {
      return res.status(401).json({ message: 'Email atau password salah' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, branch_id: user.branch_id },
      SECRET,
      { expiresIn: '2h' } // 2 hours
    );
    
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, branch_id: user.branch_id } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, points, address, phone, branch_id FROM users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  const { order_id, rating, comment } = req.body;

  // SECURITY FIX: Validasi range rating 1-5 (sama dengan pola di feedback.js)
  // Tanpa ini, bisa kirim rating negatif atau > 5 yang merusak perhitungan rata-rata
  const parsedRating = parseInt(rating);
  if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
    return res.status(400).json({ message: 'Rating harus berupa angka antara 1 sampai 5 ❌' });
  }

  try {
    // Validasi kepemilikan order dan status 'selesai' (Anti-IDOR & Alur Bisnis)
    const orderCheck = await pool.query(
      `SELECT id FROM orders WHERE id = $1 AND user_id = $2 AND status = 'selesai'`,
      [order_id, req.user.id]
    );
    if (orderCheck.rows.length === 0) {
      return res.status(403).json({ message: 'Order tidak ditemukan, bukan milik Anda, atau belum selesai ❌' });
    }


    await pool.query(
      `INSERT INTO reviews (order_id, rating, comment) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (order_id) 
       DO UPDATE SET rating = $4, comment = $5`,
      [order_id, rating, comment, rating, comment]
    );
    res.json({ message: 'Review disimpan' });
  } catch (err) {
    console.error('Review submission error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
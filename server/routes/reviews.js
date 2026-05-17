const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  const { order_id, rating, comment } = req.body;
  try {
    await pool.query(
      `INSERT INTO reviews (order_id, rating, comment) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (order_id) 
       DO UPDATE SET rating = $4, comment = $5`,
      [order_id, rating, comment, rating, comment]
    );
    res.json({ message: 'Review disimpan' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
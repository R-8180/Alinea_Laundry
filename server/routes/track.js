const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/:code', async (req, res) => {
  const code = req.params.code;
  try {
    const result = await pool.query(
      `SELECT o.id, o.order_code, o.status, o.payment_status, o.total_price, o.created_at,
              u.name AS customer_name
       FROM orders o JOIN users u ON o.user_id = u.id
       WHERE o.order_code = $1`,
      [code]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: 'Order tidak ditemukan' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
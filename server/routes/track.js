const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/:code', (req, res) => {
  const code = req.params.code;
  db.query(
    `SELECT o.id, o.order_code, o.status, o.payment_status, o.total_price, o.created_at,
            u.name AS customer_name
     FROM orders o JOIN users u ON o.user_id = u.id
     WHERE o.order_code = ?`,
    [code],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });
      if (results.length === 0) return res.status(404).json({ message: 'Order tidak ditemukan' });
      res.json(results[0]);
    }
  );
});

module.exports = router;
const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.post('/', auth, (req, res) => {
  const { order_id, rating, comment } = req.body;
  db.query(
    'INSERT INTO reviews (order_id, rating, comment) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE rating=?, comment=?',
    [order_id, rating, comment, rating, comment],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: 'Review disimpan' });
    }
  );
});

module.exports = router;
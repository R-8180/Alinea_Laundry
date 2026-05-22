const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const webpush = require('web-push');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@alinealaundry.biz.id',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}


// 1. GET /api/notifications - Get all notifications for logged in customer
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', auth, async (req, res) => {
  const userId = req.user.id;
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [userId]
    );
    res.json({ success: true, message: 'Semua notifikasi ditandai dibaca.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. DELETE /api/notifications/:id - Delete an individual notification
router.delete('/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const notifId = req.params.id;
  try {
    const result = await pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING *',
      [notifId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notifikasi tidak ditemukan' });
    }
    res.json({ success: true, message: 'Notifikasi dihapus.', deleted: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. DELETE /api/notifications - Clear all notifications for the user
router.delete('/', auth, async (req, res) => {
  const userId = req.user.id;
  try {
    await pool.query(
      'DELETE FROM notifications WHERE user_id = $1',
      [userId]
    );
    res.json({ success: true, message: 'Semua notifikasi dibersihkan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GET /api/notifications/vapidPublicKey - Provide public key to frontend
router.get('/vapidPublicKey', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// 6. POST /api/notifications/subscribe - Save push subscription
router.post('/subscribe', auth, async (req, res) => {
  const userId = req.user.id;
  const subscription = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Format subscription tidak valid.' });
  }

  try {
    // Check if subscription already exists for this user
    const exist = await pool.query(
      'SELECT id FROM push_subscriptions WHERE user_id = $1 AND subscription::text = $2::text',
      [userId, JSON.stringify(subscription)]
    );

    if (exist.rows.length === 0) {
      await pool.query(
        'INSERT INTO push_subscriptions (user_id, subscription) VALUES ($1, $2)',
        [userId, subscription]
      );
    }
    res.status(201).json({ success: true, message: 'Push subscription saved.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

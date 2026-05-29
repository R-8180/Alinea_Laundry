const express = require('express');
const router = express.Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const { sendWebPush } = require('../utils/push');

// POST /api/feedback - Customer mengirim kritik & saran (Protected)
router.post('/', auth, async (req, res) => {
  const { 
    rating_kebersihan, 
    rating_kerapian, 
    rating_parfum, 
    rating_waktu, 
    rating_web, 
    comment 
  } = req.body;
  const userId = req.user.id;

  // Validasi 5 kategori rating (opsional, minimal isi 1)
  const ratings = [
    rating_kebersihan ? parseInt(rating_kebersihan) : null,
    rating_kerapian ? parseInt(rating_kerapian) : null,
    rating_parfum ? parseInt(rating_parfum) : null,
    rating_waktu ? parseInt(rating_waktu) : null,
    rating_web ? parseInt(rating_web) : null
  ];
  
  const filledRatings = ratings.filter(r => r !== null && r !== undefined && r !== 0);

  if (filledRatings.length === 0) {
    return res.status(400).json({ error: 'Mohon berikan minimal 1 penilaian bintang.' });
  }

  const isValidRatings = filledRatings.every(r => r >= 1 && r <= 5);
  if (!isValidRatings) {
    return res.status(400).json({ error: 'Seluruh rating harus bernilai antara 1 dan 5.' });
  }

  try {
    // 1. Simpan feedback ke database
    await pool.query(
      `INSERT INTO feedback_saran (
        user_id, 
        rating_kebersihan, 
        rating_kerapian, 
        rating_parfum, 
        rating_waktu, 
        rating_web, 
        comment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId, 
        ratings[0], 
        ratings[1], 
        ratings[2], 
        ratings[3], 
        ratings[4], 
        comment || ''
      ]
    );

    // 2. Ambil nama pelanggan untuk notifikasi
    const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const customerName = userRes.rows[0]?.name || 'Pelanggan';

    // 3. Hitung rata-rata rating untuk isi notifikasi (dari yang terisi saja)
    const sum = filledRatings.reduce((a, b) => a + b, 0);
    const avgRating = (sum / filledRatings.length).toFixed(1);

    // 4. Ambil semua admin untuk diberikan notifikasi
    const adminsRes = await pool.query("SELECT id FROM users WHERE role = 'admin'");
    const admins = adminsRes.rows;

    if (admins.length > 0) {
      const insertValues = [];
      const valuePlaceholders = [];
      let paramIndex = 1;
      const title = 'Kritik & Saran Baru 💬';
      const message = `${customerName} mengirim kritik & saran dengan rata-rata rating ${avgRating}⭐`;

      for (const admin of admins) {
        valuePlaceholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
        insertValues.push(admin.id, title, message);
        sendWebPush(admin.id, {
          title,
          body: message,
          tag: 'admin-feedback',
          url: '/admin'
        }).catch(err => console.error('Feedback admin push error:', err));
      }

      const sql = `INSERT INTO notifications (user_id, title, message) VALUES ${valuePlaceholders.join(', ')}`;
      await pool.query(sql, insertValues);
    }

    res.json({ message: 'Terima kasih atas kritik & saran Anda!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/feedback - Admin melihat seluruh daftar kritik & saran (Protected Admin)
router.get('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya admin yang diperbolehkan.' });
  }

  try {
    const feedbackRes = await pool.query(
      `SELECT f.id, 
              f.rating_kebersihan, 
              f.rating_kerapian, 
              f.rating_parfum, 
              f.rating_waktu, 
              f.rating_web, 
              f.comment, 
              f.created_at, 
              u.name AS customer_name, 
              u.email AS customer_email, 
              u.phone AS customer_phone
       FROM feedback_saran f
       LEFT JOIN users u ON f.user_id = u.id
       ORDER BY f.created_at DESC`
    );
    res.json(feedbackRes.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/feedback - Admin menghapus seluruh kritik & saran (Protected Admin)
router.delete('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya admin yang diperbolehkan.' });
  }
  try {
    await pool.query('TRUNCATE TABLE feedback_saran');
    res.json({ message: 'Semua kritik & saran berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/feedback/:id - Admin menghapus salah satu kritik & saran (Protected Admin)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak. Hanya admin yang diperbolehkan.' });
  }
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM feedback_saran WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Feedback tidak ditemukan.' });
    }
    res.json({ message: 'Kritik & saran berhasil dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

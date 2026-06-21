const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');
const { uploadImage, getFileUrl } = require('../utils/upload');

// PUBLIC GET route to fetch visit stats (MUST be before GET /:key)
router.get('/visit/stats', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COALESCE((SELECT count FROM site_visits WHERE visit_date = CURRENT_DATE), 0) as today,
        COALESCE((SELECT SUM(count) FROM site_visits WHERE DATE_TRUNC('month', visit_date) = DATE_TRUNC('month', CURRENT_DATE)), 0) as month,
        COALESCE((SELECT SUM(count) FROM site_visits), 0) as total
    `);
    
    const stats = result.rows[0];
    res.json({
      today: parseInt(stats.today, 10) || 0,
      month: parseInt(stats.month, 10) || 0,
      total: parseInt(stats.total, 10) || 0
    });
  } catch (err) {
    console.error('Error fetching visit stats:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUBLIC POST route to increment visit count (MUST be before GET /:key)
router.post('/visit', async (req, res) => {
  try {
    const result = await db.query(
      `INSERT INTO site_visits (visit_date, count) 
       VALUES (CURRENT_DATE, 1) 
       ON CONFLICT (visit_date) 
       DO UPDATE SET count = site_visits.count + 1 
       RETURNING count`
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error('Error incrementing visit count:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUBLIC GET route to fetch settings (e.g. for Home.js)
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const result = await db.query('SELECT setting_value FROM app_settings WHERE setting_key = $1', [key]);
    if (result.rows.length > 0) {
      res.json(result.rows[0].setting_value);
    } else {
      res.json(null); // Return 200 with null to prevent browser console 404 errors
    }
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PROTECTED PUT route to update settings
router.put('/:key', auth, adminLimiter, async (req, res) => {
  try {
    // Only superadmin (or admin) can update global settings
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Akses ditolak' });
    }

    const { key } = req.params;
    const settingValue = req.body;

    const result = await db.query(
      `INSERT INTO app_settings (setting_key, setting_value) 
       VALUES ($1, $2) 
       ON CONFLICT (setting_key) 
       DO UPDATE SET setting_value = $2, updated_at = CURRENT_TIMESTAMP 
       RETURNING *`,
      [key, JSON.stringify(settingValue)]
    );

    res.json({ message: 'Settings updated successfully', data: result.rows[0].setting_value });
  } catch (err) {
    console.error('Error updating settings:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PROTECTED POST route to upload promo images for the CMS
router.post('/upload', auth, adminLimiter, uploadImage.single('photo'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Akses ditolak' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const photoUrl = getFileUrl(req.file.filename);
    res.json({ url: photoUrl });
  } catch (err) {
    console.error('Error uploading setting photo:', err);
    res.status(500).json({ error: 'Upload error' });
  }
});

module.exports = router;

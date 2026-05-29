const webpush = require('web-push');
const pool = require('../db');

// ⚠️ VAPID keys HARUS di-setup di sini karena file ini yang benar-benar kirim notif
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@alinealaundry.biz.id',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('⚠️  VAPID keys tidak ditemukan di environment. Push notification tidak akan berfungsi!');
}

/**
 * Mengirim Web Push Notification ke seluruh perangkat user yang terdaftar
 * @param {number|string} userId - ID dari user yang akan dikirimi notifikasi
 * @param {object} payload - Objek payload (misal: { title: '...', body: '...' })
 */
const sendWebPush = async (userId, payload) => {
  try {
    // 1. Ambil semua subscription dari database
    const result = await pool.query('SELECT subscription FROM push_subscriptions WHERE user_id = $1', [userId]);
    const subscriptions = result.rows;
    
    if (subscriptions.length === 0) return; // User belum mengizinkan notifikasi

    const pushPayload = JSON.stringify(payload);

    // 2. Kirim notif ke setiap perangkat
    const promises = subscriptions.map(sub => {
      return webpush.sendNotification(sub.subscription, pushPayload)
        .catch(err => {
          // Jika 404/410 berarti user mencabut izin atau token kedaluwarsa, jadi kita hapus dari DB
          if (err.statusCode === 404 || err.statusCode === 410) {
            return pool.query("DELETE FROM push_subscriptions WHERE subscription->>'endpoint' = $1", [sub.subscription.endpoint]);
          } else {
            console.error('Error sending web push to device:', err);
          }
        });
    });

    await Promise.all(promises);
  } catch (err) {
    console.error('Error in sendWebPush utility:', err);
  }
};

module.exports = { sendWebPush };

import axios from 'axios';

// Konversi public VAPID key dari backend menjadi format binary (Uint8Array)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Meminta izin kepada pengguna dan mensubscribe perangkat ini ke server Push
 */
export const subscribeUserToPush = async (token) => {
  // Cek kompatibilitas browser
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Browser tidak mendukung Push Notification');
    return;
  }

  try {
    // Cek apakah user sudah memberikan izin (granted), ditolak (denied), atau belum (default)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Izin notifikasi tidak diberikan oleh pengguna.');
      return;
    }

    // 1. Registrasi service worker
    const register = await navigator.serviceWorker.register('/sw.js');
    
    // Tunggu service worker sampai aktif
    await navigator.serviceWorker.ready;

    // 2. Ambil public key dari backend
    const { data: { publicKey } } = await axios.get('/api/notifications/vapidPublicKey', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!publicKey) return;

    // 3. Lakukan proses subscribe dengan VAPID key
    const subscription = await register.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    // 4. Kirim subscription data ke backend untuk disimpan
    await axios.post('/api/notifications/subscribe', subscription, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Push notification berhasil di-subscribe ke backend.');
    
  } catch (err) {
    console.error('Gagal subscribe ke push notifications:', err);
  }
};

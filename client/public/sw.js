/* eslint-disable no-restricted-globals */

self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const payload = event.data.json();
      const options = {
        body: payload.body,
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [200, 100, 200, 100, 200, 100, 200],
        data: {
          url: payload.url || '/'
        }
      };

      event.waitUntil(
        self.registration.showNotification(payload.title || 'Alinea Laundry', options)
      );
    } catch (e) {
      console.error('Error parsing push data:', e);
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data && event.notification.data.url) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url)
    );
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

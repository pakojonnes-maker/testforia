
// public/sw.js
const SW_VERSION = 'v1.1.0';

self.addEventListener('install', (event) => {
    console.log(`[SW] Installing version ${SW_VERSION}`);
    self.skipWaiting(); // Force update
});

self.addEventListener('activate', (event) => {
    console.log(`[SW] Activating version ${SW_VERSION}`);
    event.waitUntil(clients.claim()); // Take control immediately
});

self.addEventListener('push', function (event) {
    console.log('[SW] Push Received', event);
    try {
        if (event.data) {
            // Try to text first to debug just in case JSON fails
            const rawText = event.data.text();
            console.log('[SW] Push Data Text:', rawText);

            const data = JSON.parse(rawText);
            console.log('[SW] Push Data JSON:', data);

            const options = {
                body: data.body,
                icon: data.icon || '/icon.png',
                badge: data.badge || data.icon || '/badge.png', // Fallback to icon if badge missing, though badge should be monochrome
                image: data.image, // Big Picture support
                color: data.color, // Android Accent Color
                vibrate: [100, 50, 100],
                data: {
                    dateOfArrival: Date.now(),
                    primaryKey: '2',
                    url: data.data?.url || '/'
                },
                actions: [
                    { action: 'explore', title: 'Ver ahora', icon: '/checkmark.png' },
                ]
            };
            event.waitUntil(
                self.registration.showNotification(data.title, options)
            );
        } else {
            console.warn('[SW] Push event received but no data');
        }
    } catch (err) {
        console.error('[SW] Error handling push event:', err);
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

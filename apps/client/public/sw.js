// public/sw.js - Service Worker with PWA Support for iOS
const SW_VERSION = 'v2.0.0';
const CACHE_NAME = 'visualtaste-cache-v2';

// Assets to cache for offline support
const STATIC_ASSETS = [
    '/',
    '/logo.png',
    '/favicon.ico'
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
    console.log(`[SW] Installing version ${SW_VERSION}`);
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('[SW] Some assets failed to cache:', err);
            });
        })
    );
    self.skipWaiting(); // Force update
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
    console.log(`[SW] Activating version ${SW_VERSION}`);
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => clients.claim())
    );
});

// Fetch: Network-first with cache fallback for navigation
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Skip non-GET requests
    if (request.method !== 'GET') return;

    // Skip API calls and external resources
    if (request.url.includes('/api/') ||
        request.url.includes('/track/') ||
        !request.url.startsWith(self.location.origin)) {
        return;
    }

    // For navigation requests (HTML pages)
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache successful responses
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Return cached version if offline
                    return caches.match(request).then(cachedResponse => {
                        return cachedResponse || caches.match('/');
                    });
                })
        );
        return;
    }

    // For static assets: Cache-first strategy
    if (request.url.match(/\.(png|jpg|jpeg|gif|svg|ico|woff2?)$/)) {
        event.respondWith(
            caches.match(request).then(cachedResponse => {
                if (cachedResponse) {
                    // Return cached, but also update cache in background
                    fetch(request).then(response => {
                        if (response.ok) {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(request, response);
                            });
                        }
                    }).catch(() => { });
                    return cachedResponse;
                }
                return fetch(request).then(response => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }
});

// Push notification handling
self.addEventListener('push', function (event) {
    console.log('[SW] Push Received', event);
    try {
        if (event.data) {
            const rawText = event.data.text();
            console.log('[SW] Push Data Text:', rawText);

            const data = JSON.parse(rawText);
            console.log('[SW] Push Data JSON:', data);

            const options = {
                body: data.body,
                icon: data.icon || '/logo.png',
                badge: data.badge || '/logo.png',
                image: data.image,
                vibrate: [100, 50, 100],
                tag: data.tag || 'visualtaste-notification',
                renotify: true,
                data: {
                    dateOfArrival: Date.now(),
                    primaryKey: data.id || '1',
                    url: data.data?.url || data.url || '/'
                },
                actions: [
                    { action: 'open', title: 'Ver ahora', icon: '/logo.png' },
                ]
            };

            event.waitUntil(
                self.registration.showNotification(data.title || 'VisualTaste', options)
            );
        } else {
            console.warn('[SW] Push event received but no data');
        }
    } catch (err) {
        console.error('[SW] Error handling push event:', err);
    }
});

// Notification click handling
self.addEventListener('notificationclick', function (event) {
    console.log('[SW] Notification clicked:', event.action);
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // Check if there's already a window open
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Open new window if none exists
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Handle notification close
self.addEventListener('notificationclose', function (event) {
    console.log('[SW] Notification closed');
});

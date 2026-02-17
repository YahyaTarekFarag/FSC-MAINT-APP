import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

self.skipWaiting();
clientsClaim();

// Push Notification Listener
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'عرض جديد';
    const options = {
        body: data.body || 'لديك إشعار جديد من تطبيق الصيانة',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: { url: data.url || '/' }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification Click Listener
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.openWindow(event.notification.data.url)
    );
});

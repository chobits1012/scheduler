const CACHE_NAME = 'shiftsync-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/index.css',
    '/manifest.json',
    '/icon-512.png',
    // Note: main.js naming varies in Vite dev vs build. 
    // In dev, we mostly rely on browser caching, but this SW sets up the structure.
    // For production build, Vite injects assets, but a basic offline fallback is good.
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS).catch(err => {
                console.warn('Failed to cache some assets', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Only handle http/https requests
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).catch(() => {
                // Fallback or just fail if offline and not cached
                // In a SPA, we might want to return index.html for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});

const CACHE_NAME = 'infinite-runner-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/src/styles.css',
    '/src/game.js',
    '/manifest.json',
    '/icons/hero.png',
    '/icons/coin.png',
    '/icons/background1.png',
    '/icons/background2.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached version or fetch from network
                return response || fetch(event.request);
            })
    );
});

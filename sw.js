// Service worker: online zawsze świeże dane (network-first), offline ostatnia zapisana kopia.
// Odpowiedzi z pamięci niosą nagłówek x-cached-at, po którym strona pokazuje baner trybu offline.
const CACHE = 'kaczuszki-v1';

const PRECACHE = [
    './',
    'index.html',
    'styles.css',
    'manifest.webmanifest',
    'icons/icon.svg',
    'icons/favicon-32.png',
    'icons/apple-touch-icon.png',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'js/balance.js',
    'js/banking.js',
    'js/collections.js',
    'js/config.js',
    'js/events.js',
    'js/expenses.js',
    'js/lookup.js',
    'js/main.js',
    'js/offline.js',
    'js/theme.js',
    'js/utils.js',
    'data/banking.json',
    'data/collections.json',
    'data/events.json',
    'data/expenses.json',
    'data/incomes.json',
];

async function stamp(response) {
    const headers = new Headers(response.headers);
    headers.set('x-cached-at', new Date().toISOString());
    return new Response(await response.blob(), { status: response.status, statusText: response.statusText, headers });
}

async function networkFirst(request) {
    const cache = await caches.open(CACHE);
    try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, await stamp(response.clone()));
        return response;
    } catch (err) {
        const cached = await cache.match(request, { ignoreSearch: true })
            || (request.mode === 'navigate' && await cache.match('./'));
        if (cached) return cached;
        throw err;
    }
}

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        await Promise.all(PRECACHE.map(async (url) => {
            const response = await fetch(url, { cache: 'reload' });
            if (!response.ok) throw new Error(`Nie można zapisać ${url}: ${response.status}`);
            await cache.put(url, await stamp(response));
        }));
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
    event.respondWith(networkFirst(request));
});

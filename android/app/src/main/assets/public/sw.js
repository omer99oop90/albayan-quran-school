/**
 * ALBAYAN QURAN SCHOOL - UNIVERSAL SERVICE WORKER
 * Offline Caching & Background Asset Sync for Mobile Application
 */

const CACHE_NAME = 'albayan-app-v16';
const OFFLINE_ASSETS = [
  'style.css',
  'dark_theme.css?v=2.2',
  'mobile_bottom_nav.css?v=2.0',
  'circles.css',
  'theme-init.js',
  'mobile-db.js?v=3.0',
  'mobile_bottom_nav.js?v=2.0',
  'circles.js?v=8.0',
  'admin.js?v=9.8',
  'roster.js?v=10.0',
  'firebase-client.js?v=3.0',
  'lucide.min.js',
  'logo.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_ASSETS).catch((err) => {
        console.warn('Some assets could not be precached:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Do not cache non-GET requests or dynamic APIs (handled by IndexedDB / Sync Queue)
  if (req.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // Network First, Falling Back to Cache for HTML & Assets
  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req).then((cachedRes) => {
          if (cachedRes) return cachedRes;
          // Fallback to /circles if navigating to a page while offline
          if (req.mode === 'navigate') {
            return caches.match('/circles');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

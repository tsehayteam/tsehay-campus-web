// Tsehay Campus Lightweight PWA Service Worker (Strict Live-Sync NetworkFirst)
const CACHE_NAME = 'tsehay-campus-live-v4';
const STATIC_PRECACHE = [
  '/manifest.json',
  '/favicon.png',
  '/tc-logo.jpg',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests, avoid intercepting Firebase/API/Media requests
  if (
    event.request.method !== 'GET' ||
    event.request.url.includes('/api/') ||
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('identitytoolkit') ||
    event.request.url.includes('googleapis') ||
    event.request.url.includes('youtube.com') ||
    event.request.url.includes('vimeo.com')
  ) {
    return;
  }

  // HTML page navigations & Next.js chunks -> ALWAYS fetch fresh from live network
  if (event.request.mode === 'navigate' || event.request.url.includes('/_next/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Network first with fallback for static assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});


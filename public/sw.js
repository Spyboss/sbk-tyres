const CACHE_NAME = 'sbk-tyres-v3';

const STATIC_ASSETS = [
  '/',
  '/catalog',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icon-192.png',
  '/icon-512.png',
];

const PROTECTED_PATH_PREFIXES = ['/admin', '/orders', '/cart', '/checkout', '/profile'];

const isSameOrigin = (url) => url.origin === self.location.origin;

const isProtectedPath = (pathname) =>
  PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

const isStaticAssetRequest = (request, url) => {
  if (request.method !== 'GET' || !isSameOrigin(url)) {
    return false;
  }

  if (STATIC_ASSETS.includes(url.pathname)) {
    return true;
  }

  return url.pathname.startsWith('/_next/static/');
};

const cacheResponse = async (request, response) => {
  if (!response || !response.ok || response.type !== 'basic') {
    return;
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
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

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CLEAR_APP_CACHE') {
    return;
  }

  event.waitUntil(caches.delete(CACHE_NAME));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET' || !isSameOrigin(url)) {
    return;
  }

  if (event.request.mode === 'navigate') {
    if (isProtectedPath(url.pathname)) {
      return;
    }

    if (url.pathname !== '/' && url.pathname !== '/catalog') {
      return;
    }

    event.respondWith(
      fetch(event.request).catch(async () => {
        return caches.match('/') || Response.error();
      })
    );
    return;
  }

  if (!isStaticAssetRequest(event.request, url)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) {
        return cached;
      }

      try {
        const response = await fetch(event.request, { cache: 'no-store' });
        await cacheResponse(event.request, response);
        return response;
      } catch {
        return cached || Response.error();
      }
    })
  );
});

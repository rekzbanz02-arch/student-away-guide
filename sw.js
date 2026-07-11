// Student Away Guide PH — Service Worker
// Bump CACHE_VERSION whenever index.html (or any cached asset) changes,
// so users automatically get the update.
const CACHE_VERSION = "v1";
const CACHE_NAME = `away-guide-${CACHE_VERSION}`;

// Everything the app needs to fully work offline is pre-installed
// (cached) the moment the service worker installs.
const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

// --- INSTALL: pre-cache the app shell ---
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// --- ACTIVATE: clean up old cache versions ---
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("away-guide-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// --- FETCH: serve from cache first, fall back to network,
//     then keep the cache fresh in the background ---
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests from this origin
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) {
    return;
  }

  // For navigations, try the network first so users get fresh content
  // when online, and fall back to the cached shell when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // For everything else: cache-first, update cache in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

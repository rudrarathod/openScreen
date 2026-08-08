const CACHE_NAME = "openscreen-cache-v1";

// Cache static files on install
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/pwa-icon.svg",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Only handle local same-origin requests
  if (url.origin === self.location.origin) {
    // Exclude hot module reloading (Vite HMR) websockets or other dev endpoints
    if (url.pathname.includes("@vite") || url.pathname.includes("node_modules")) {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If response is valid, clone and cache it
          if (response && response.status === 200) {
            const responseCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseCopy);
            });
          }
          return response;
        })
        .catch(() => {
          // Network failed (e.g. host down or offline) -> serve from cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback for HTML page navigations (SPA routing support)
            if (event.request.mode === "navigate") {
              return caches.match("/index.html");
            }
          });
        })
    );
  }
});

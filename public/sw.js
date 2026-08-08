const CACHE_NAME = "openscreen-app-v2";
const API_CACHE_NAME = "openscreen-api-v2";

// Static assets to precache on install
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/pwa-icon.svg",
  "/manifest.json"
];

// Install Event: Precache App Shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn("SW precache error:", err);
      }
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches & claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Offline & Domain Downtime Resilience
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept GET requests
  if (request.method !== "GET") return;

  // 1. Navigation Requests (App Shell - index.html)
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Attempt network fetch
          const networkResponse = await fetch(request);
          // If server returns success (200-299), cache and return it
          if (networkResponse && networkResponse.status >= 200 && networkResponse.status < 400) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
          // If domain is down (500, 502, 503, 504), fallback to cached index.html
          const cachedAppShell = await caches.match("/index.html");
          if (cachedAppShell) return cachedAppShell;
          return networkResponse;
        } catch (error) {
          // Domain down or offline -> return cached App Shell
          const cachedAppShell = await caches.match("/index.html") || await caches.match("/");
          if (cachedAppShell) return cachedAppShell;
          return new Response("Offline - openScreen is operating offline.", {
            status: 200,
            headers: { "Content-Type": "text/html" },
          });
        }
      })()
    );
    return;
  }

  // 2. Same-Origin Static Assets (JS, CSS, Images, Fonts)
  if (url.origin === self.location.origin) {
    // Ignore Vite Dev HMR
    if (url.pathname.includes("@vite") || url.pathname.includes("node_modules")) {
      return;
    }

    event.respondWith(
      (async () => {
        // Cache-First with Network Fallback
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          // Revalidate in background if online
          fetch(request)
            .then(async (networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, networkResponse);
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // Fallback to index.html if asset fetch fails during navigation
          const fallback = await caches.match("/index.html");
          if (fallback) return fallback;
          return new Response("", { status: 404 });
        }
      })()
    );
    return;
  }

  // 3. External API Requests (Caching media/anime/movie API responses for offline resilience)
  if (url.protocol.startsWith("http")) {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(API_CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // API down or network offline -> Serve cached API data if available
          const cachedApiResponse = await caches.match(request);
          if (cachedApiResponse) {
            return cachedApiResponse;
          }
          // Return clean JSON error payload so app code handles it smoothly without crashing
          return new Response(JSON.stringify({ error: "Offline mode", data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      })()
    );
  }
});

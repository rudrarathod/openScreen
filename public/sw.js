const CACHE_NAME = "openscreen-shell-v3";
const API_CACHE_NAME = "openscreen-api-v3";

const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/pwa-icon.svg"
];

// 1. Install Event: Force immediate caching of app shell & activate immediately
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(PRECACHE_ASSETS);
      } catch (err) {
        console.warn("Precache failed:", err);
      }
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Clean up old caches and take control of all open pages immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch Event: Absolute resilience on Refresh & Offline
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // A. SPA Navigation Requests (e.g. Refresh on /, /search, /watchlist, /anime/123)
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        // Look up cached App Shell first
        const cachedShell =
          (await caches.match("/index.html")) ||
          (await caches.match("/")) ||
          (await caches.match(request));

        try {
          const networkResponse = await fetch(request);
          // If server returns valid response, update cache and return
          if (networkResponse && networkResponse.status >= 200 && networkResponse.status < 400) {
            const cache = await caches.open(CACHE_NAME);
            cache.put("/index.html", networkResponse.clone());
            cache.put("/", networkResponse.clone());
            return networkResponse;
          }
          // Server returned error (500, 502, 503, 404, Cloudflare down) -> serve cached App Shell!
          if (cachedShell) return cachedShell;
          return networkResponse;
        } catch (error) {
          // Domain down / Network offline / DNS error -> ALWAYS return cached App Shell!
          if (cachedShell) return cachedShell;

          // Safe fallback HTML if cache was cleared
          return new Response(
            `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>openScreen</title><style>body{background:#09090b;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;}</style></head><body><div><h2 style="color:#8b5cf6">openScreen</h2><p>App loaded in offline mode.</p><button onclick="location.reload()" style="background:#8b5cf6;color:#fff;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:bold;">Refresh</button></div></body></html>`,
            { status: 200, headers: { "Content-Type": "text/html" } }
          );
        }
      })()
    );
    return;
  }

  // B. Same-Origin Assets (JS, CSS, Icons, Fonts)
  if (url.origin === self.location.origin) {
    // Exclude Vite dev server websocket HMR requests
    if (url.pathname.includes("@vite") || url.pathname.includes("node_modules")) {
      return;
    }

    event.respondWith(
      (async () => {
        // Cache-First with Background Network Revalidation
        const cachedAsset = await caches.match(request);
        if (cachedAsset) {
          fetch(request)
            .then(async (netRes) => {
              if (netRes && netRes.ok) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, netRes);
              }
            })
            .catch(() => {});
          return cachedAsset;
        }

        try {
          const netRes = await fetch(request);
          if (netRes && netRes.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, netRes.clone());
          }
          return netRes;
        } catch (err) {
          return new Response("", { status: 404 });
        }
      })()
    );
    return;
  }

  // C. External Public API Requests (AniList, TMDB, Consumet)
  if (url.protocol.startsWith("http")) {
    event.respondWith(
      (async () => {
        try {
          const netRes = await fetch(request);
          if (netRes && netRes.ok) {
            const cache = await caches.open(API_CACHE_NAME);
            cache.put(request, netRes.clone());
          }
          return netRes;
        } catch (err) {
          // Serve cached API response when offline or API down
          const cachedApi = await caches.match(request);
          if (cachedApi) return cachedApi;
          return new Response(JSON.stringify({ error: "Offline mode", data: [] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      })()
    );
  }
});

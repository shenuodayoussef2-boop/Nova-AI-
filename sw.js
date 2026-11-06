
const CACHE_NAME = "yovia-ai-pwa-v3";

const APP_SHELL = [
  "/manifest.webmanifest"
];

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        APP_SHELL.map((url) => cache.add(url))
      );
    })
  );

  self.skipWaiting();
});

// Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      await Promise.all(
        keys
          .filter(
            (key) =>
              (key.startsWith("nova-ai-pwa-") ||
               key.startsWith("yovia-ai-pwa-")) &&
              key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })
  );
});

// Fetch
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Never cache API or authentication requests
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("auth") ||
    url.pathname.includes("supabase")
  ) {
    return;
  }

  // Network-first for page navigation
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          "أنت غير متصل بالإنترنت. اتصل بالشبكة لاستخدام YOVIA AI.",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain; charset=utf-8"
            }
          }
        )
      )
    );

    return;
  }

  // Network-first for manifest
  if (url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, copy);
            });
          }

          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);

          return cached || Response.error();
        })
    );
  }
});

/**
 * Minimal service worker for PWA install + static asset offline cache.
 *
 * Strategy:
 * - Static assets (/_next/static/*, public SVG/PNG, /icon, /apple-icon):
 *   cache-first with background refresh.
 * - HTML navigations / RSC / Server Actions / Supabase fetches: network-first,
 *   no offline fallback (the app is data-driven and we don't want to show stale
 *   scores pretending to be live data).
 *
 * Bump CACHE_VERSION to invalidate on deploy.
 */

const CACHE_VERSION = "karareparu-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

// These URLs are resolved against the SW scope, not hard-coded paths.
const PRECACHE_URLS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        /* ignore precache failures — core functionality shouldn't depend on them */
      }),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/icon" ||
    url.pathname === "/apple-icon" ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle same-origin GET requests.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(req);
        const networkPromise = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => null);
        return cached ?? (await networkPromise) ?? Response.error();
      })(),
    );
    return;
  }

  // For HTML navigations + RSC + everything else: network-only. No offline
  // fallback yet — the app surfaces live scoring data and stale copies would
  // be misleading. If offline, the browser shows its native error page.
});

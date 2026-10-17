// Network-first for same-origin GET (cache fallback, so no version bumps needed);
// cache-first for pinned CDN URLs; offline navigations fall back to cached index.
const CACHE = 'aaba-rt';
const CDN = ['cdn.jsdelivr.net', 'www.gstatic.com'];
const timeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html'])).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

async function networkFirst(req) {
  const c = await caches.open(CACHE);
  try {
    const r = await timeout(fetch(req), 4000);
    if (r && r.ok) c.put(req, r.clone());
    return r;
  } catch (err) {
    const hit = (await c.match(req)) || (req.mode === 'navigate' && ((await c.match('./index.html')) || (await c.match('./'))));
    if (hit) return hit;
    throw err;
  }
}
async function cacheFirst(req) {
  const c = await caches.open(CACHE), hit = await c.match(req);
  if (hit) return hit;
  const r = await fetch(req);
  if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone());
  return r;
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) e.respondWith(networkFirst(req));
  else if (CDN.includes(u.hostname)) e.respondWith(cacheFirst(req));
});

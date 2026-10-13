// sw.js – Trainings-App Peking
// Netzwerk zuerst (mit Zeitlimit), sonst Cache:
// Updates kommen automatisch an, offline oder ohne VPN läuft die App aus dem Cache.
const CACHE = 'training-v2';
const CORE = ['./', './index.html'];
const TIMEOUT_MS = 4000;

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(networkFirst(req));
});

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await withTimeout(fetch(req), TIMEOUT_MS);
    if (res && res.ok && !res.redirected && res.type === 'basic') {
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const hit = (await cache.match(req, { ignoreSearch: true }))
      || (req.mode === 'navigate'
          ? (await cache.match('./index.html')) || (await cache.match('./'))
          : null);
    if (hit) return hit;
    throw err;
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(r => { clearTimeout(t); resolve(r); },
                 e => { clearTimeout(t); reject(e); });
  });
}

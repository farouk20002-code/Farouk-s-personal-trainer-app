// Offline support: cache the app files, serve them from cache, refresh in the background.
const CACHE = 'farouks-coach-v1';
const FILES = ['./', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icon.svg', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/app.js', 'js/util.js', 'js/ui.js', 'js/store.js', 'js/training.js', 'js/foods.js', 'js/recipes.js', 'js/mealplan.js', 'js/adapt.js', 'js/status.js', 'js/ics.js', 'js/photos.js',
  'js/views/today.js', 'js/views/train.js', 'js/views/food.js', 'js/views/progress.js', 'js/views/coach.js', 'js/views/settings.js'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
// Network first (so updates arrive), cache as fallback when offline.
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});

const CACHE_NAME = 'finjava-senior-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './data.js',
  './app.js',
  './icon.svg',
  './manifest.webmanifest',
  './content/lessons-j.js',
  './content/lessons-s.js',
  './content/lessons-d.js',
  './content/lessons-m.js',
  './content/lessons-b.js',
  './content/lessons-k.js',
  './content/lessons-f.js',
  './content/lessons-o.js',
  './content/lessons-a.js',
  './content/lessons-c.js',
  './content/examples-j-s.js',
  './content/examples-d-m.js',
  './content/examples-b-k.js',
  './content/examples-f-o.js',
  './content/examples-a-c.js',
  './content/exams-r1-r2.js',
  './content/exams-r3-r4.js',
  './content/interview-sim.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return res;
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
  );
});

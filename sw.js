
const CACHE_NAME = "target-app-v5";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg"
];

// تثبيت Service Worker وتخزين ملفات التطبيق
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// حذف النسخ القديمة من الكاش
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith("target-app-") && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// التعامل مع طلبات الملفات والصفحات
self.addEventListener("fetch", event => {
  const request = event.request;

  // طلبات الصفحات: حاول الشبكة أولاً ثم النسخة المحفوظة
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put("./index.html", copy);
            });
          }
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // الملفات الثابتة: الكاش أولاً ثم الشبكة
  const url = new URL(request.url);

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, copy);
            });
          }
          return response;
        });
      })
    );
  }
});

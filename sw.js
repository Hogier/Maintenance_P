const CACHE_NAME = "site-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/tasks.css",
  "/tasks.js",
  "/task.php",
  "/database.js",
  "/jawa script.js",
  "/temp.php",
  "/database.php",
  "/httpd.conf",
  "/test_connection.php",
  "/sw.js",
  // Добавьте другие HTML, CSS и JS файлы, которые нужно кэшировать
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Открыт кэш");
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("activate", (event) => {
  console.log("Активирован");
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Удаление старого кэша", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      });
    })
  );
});

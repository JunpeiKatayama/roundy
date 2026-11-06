// 保存済みの作品をオフラインでも開けるようにする。常にネットワークを優先し、更新の取り残しを防ぐ
const CACHE = "roundy-v2";
const ASSETS = [
  "./", "index.html", "style.css", "icon.svg", "manifest.webmanifest", "knitting-dictionary.js",
  "js/app.js", "js/parser.js", "js/pdf-lines.js", "js/pdf-url.js", "js/storage.js", "js/translator.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }))
  );
});

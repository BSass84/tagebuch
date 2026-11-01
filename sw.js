/* Service Worker: hält die App offline verfügbar.
   VERSION erhöhen (z. B. v2), wenn nach einem Update
   alle Geräte den neuen Stand laden sollen. */

const VERSION = "tagebuch-v4";
const DATEIEN = [
  "index.html",
  "modules.json",
  "style.css",
  "manifest.webmanifest",
  "js/common.js",
  "js/db.js",
  "modules/tagebuch.html",
  "modules/kurznotiz.html",
  "modules/verwalten.html",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(DATEIEN)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((treffer) => treffer || fetch(e.request))
  );
});

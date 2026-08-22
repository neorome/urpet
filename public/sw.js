const VERSION = "urpet-shell-20260821a";

const SHELL = Object.freeze([
  "/",
  "/dogs/",
  "/breeds/",
  "/photo-credits/",
  "/404.html",
  "/styles.css",
  "/site.webmanifest",
  "/favicon.svg",
  "/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/scripts/all-pets.js",
  "/scripts/all-pets-engine.js",
  "/scripts/all-pets-flow.js",
  "/scripts/app.js",
  "/scripts/breed-engine.js",
  "/scripts/breed-catalog.js",
  "/scripts/breed-photos.js",
  "/scripts/dog-engine.js",
  "/scripts/catalog.js",
  "/scripts/external-links.js",
  "/scripts/pwa.js",
  "/scripts/rescue-map.js",
  "/scripts/rescue-search.js",
  "/scripts/honduras-rescues.js",
  "/data/profile-photos.js"
]);

function sameOrigin(url) {
  return url.origin === self.location.origin;
}

function isApi(url) {
  return url.pathname.startsWith("/api/");
}

function isHtmlRequest(request) {
  return request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");
}

function cacheKey(request) {
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function put(cache, request, response) {
  if (!response || !response.ok) return response;
  await cache.put(cacheKey(request), response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const response = await fetch(request);
    return await put(cache, request, response);
  } catch {
    const cached = await cache.match(cacheKey(request));
    if (cached) return cached;
    if (isHtmlRequest(request)) {
      return (await cache.match("/")) || (await cache.match("/404.html")) || Response.error();
    }
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(cacheKey(request));
  if (cached) return cached;
  try {
    const response = await fetch(request);
    return await put(cache, request, response);
  } catch {
    return Response.error();
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!sameOrigin(url) || isApi(url)) return;
  event.respondWith(isHtmlRequest(event.request) ? networkFirst(event.request) : cacheFirst(event.request));
});

const VERSION = "urpet-shell-20260825b";

const SHELL = Object.freeze([
  "/paper.css",
  "/desk.css",
  "/fonts/instrument-serif.woff2",
  "/fonts/instrument-serif-italic.woff2",
  "/fonts/instrument-sans-400.woff2",
  "/fonts/instrument-sans-500.woff2",
  "/fonts/instrument-sans-600.woff2",
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
  if (!/\.(?:css|js)$/.test(url.pathname) || !url.searchParams.has("v")) {
    url.search = "";
  }
  url.hash = "";
  return url.toString();
}

function isFreshAsset(url) {
  return /\.(?:css|js)$/.test(url.pathname);
}

async function put(cache, request, response) {
  if (!response || !response.ok) return response;
  await cache.put(cacheKey(request), response.clone());
  return response;
}

async function fromNetwork(request) {
  return fetch(request, { cache: "reload" });
}

async function networkOnlyHtml(request) {
  try {
    return await fromNetwork(request);
  } catch {
    const cache = await caches.open(VERSION);
    return (await cache.match("/404.html")) || Response.error();
  }
}

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    return await put(cache, request, await fromNetwork(request));
  } catch {
    const cached = await cache.match(cacheKey(request));
    if (cached) return cached;
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(cacheKey(request));
  if (cached) return cached;
  try {
    return await put(cache, request, await fromNetwork(request));
  } catch {
    return Response.error();
  }
}

async function claimOpenClients() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)));
  await self.clients.claim();
  const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  await Promise.all(windows.map((client) => (
    typeof client.navigate === "function"
      ? client.navigate(client.url)
      : client.postMessage({ type: "urpet-reload" })
  )));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(claimOpenClients());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (!sameOrigin(url) || isApi(url)) return;
  event.respondWith(
    isHtmlRequest(event.request)
      ? networkOnlyHtml(event.request)
      : isFreshAsset(url)
        ? networkFirst(event.request)
        : cacheFirst(event.request)
  );
});

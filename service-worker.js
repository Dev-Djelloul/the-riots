const SHELL_CACHE = "veille-shell-v19";
const FEED_CACHE = "veille-feed-v2";
const SHELL_FILES = [
  "/",
  "/index.html",
  "/styles.css",
  "/app.js",
  "/geography.js",
  "/pwa.js",
  "/manifest.webmanifest",
  "/icons/veille.svg",
  "/icons/veille-192.png",
  "/icons/veille-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icons8-facebook-96.png",
  "/icons/icons8-instagram.png",
  "/icons/icons8-tiktok-100.png",
  "/icons/icons8-twitch-96.png",
  "/icons/icons8-youtube-96.png",
  "/icons/channel-franceinfo.svg",
  "/icons/channel-france24.svg",
  "/icons/channel-bfmtv.svg",
  "/icons/channel-euronews.svg",
  "/icons/channel-lci.png",
  "/icons/channel-tv5monde.svg",
  "/icons/channel-cnews.svg",
  "/icons/press/20-minutes.png",
  "/icons/press/bfmtv.png",
  "/icons/press/challenges.png",
  "/icons/press/cnews.png",
  "/icons/press/dw-de.png",
  "/icons/press/dwnews.png",
  "/icons/press/eldiario.png",
  "/icons/press/elpais.png",
  "/icons/press/france-24.png",
  "/icons/press/france-inter.png",
  "/icons/press/franceinfo.png",
  "/icons/press/humanite.png",
  "/icons/press/la-croix.png",
  "/icons/press/la-depeche.png",
  "/icons/press/le-figaro.png",
  "/icons/press/le-monde.png",
  "/icons/press/le-parisien.png",
  "/icons/press/lexpress.png",
  "/icons/press/liberation.png",
  "/icons/press/ouest-france.png",
  "/icons/press/rainews.png",
  "/icons/press/repubblica.png",
  "/icons/press/rfi.png",
  "/icons/press/rtbf.png",
  "/icons/press/rtve.png",
  "/icons/press/sud-ouest.png",
  "/icons/press/tagesschau.png",
  "/icons/press/vrt.png",
  "/data/communes.json",
  "/data/departements.geojson",
  "/data/europe-countries.geojson",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("veille-") && ![SHELL_CACHE, FEED_CACHE].includes(key))
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === "/api/veille") {
    event.respondWith(networkFirstFeed(request));
    return;
  }

  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(networkFirstAsset(request));
});

async function networkFirstFeed(request) {
  const cache = await caches.open(FEED_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      try {
        await cache.put(request, response.clone());
      } catch (error) {
        console.warn("Impossible de mettre en cache le dernier flux RSS.", error);
      }
    }
    if (response.ok) return response;
    const cached = await cache.match(request);
    return cached ? markAsOffline(cached) : response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return markAsOffline(cached);
    return Response.json(
      { articles: [], sources: [], fetchedAt: null, warning: "Flux indisponibles hors connexion." },
      { status: 503 },
    );
  }
}

async function networkFirstAsset(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      try {
        const cache = await caches.open(SHELL_CACHE);
        await cache.put(request, response.clone());
      } catch (error) {
        console.warn("Impossible de mettre en cache une ressource de l’application.", error);
      }
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      return (await caches.match("/index.html")) || Response.error();
    }
    return Response.error();
  }
}

function markAsOffline(response) {
  const headers = new Headers(response.headers);
  headers.set("X-PWA-Offline", "true");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

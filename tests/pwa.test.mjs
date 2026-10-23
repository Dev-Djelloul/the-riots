import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("PWA manifest points to an existing scalable app icon", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", root), "utf8"));

  assert.equal(manifest.name, "Veille — événements en France et en Europe");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons[0].sizes, "any");
  assert.equal(manifest.icons[0].purpose, "any maskable");
  await readFile(new URL(manifest.icons[0].src.slice(1), root), "utf8");
});

test("social and channel logos referenced by the page exist and are pre-cached", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const serviceWorker = await readFile(new URL("service-worker.js", root), "utf8");
  assert.ok(serviceWorker.includes('"/data/europe-countries.geojson"'));
  const iconPaths = [...html.matchAll(/src="(\/icons\/[^"]+)"/g)].map((match) => match[1]);

  assert.ok(iconPaths.length > 0);
  for (const iconPath of new Set(iconPaths)) {
    await readFile(new URL(iconPath.slice(1), root));
    assert.ok(serviceWorker.includes(`"${iconPath}"`), `${iconPath} should be precached`);
  }
});

test("European live video cards point to official players and broadcasters", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const app = await readFile(new URL("app.js", root), "utf8");
  const serviceWorker = await readFile(new URL("service-worker.js", root), "utf8");

  assert.match(html, /Directs européens/);
  for (const channel of ["dwnews", "rtve", "rtbf", "vrt", "rainews", "tagesschau24"]) {
    assert.match(html, new RegExp(`data-channel="${channel}"`));
  }
  assert.match(app, /id: "UCknLrEdhRCp1aegoMqRaCZg"/);
  assert.match(app, /liveUrl: "https:\/\/www\.youtube\.com\/@dwnews\/live"/);
  assert.match(app, /siteUrl: "https:\/\/www\.rtve\.es\/play\/videos\/directo\/24h\/"/);
  assert.match(html, /https:\/\/www\.rtve\.es\/play\/videos\/directo\/24h\//);
  assert.match(html, /https:\/\/auvio\.rtbf\.be\/direct\/info/);
  const rtveCard = html.match(/<article class="live-stream-card stream-featured" data-channel="rtve">([\s\S]*?)<\/article>/)?.[1];
  assert.ok(rtveCard);
  assert.match(rtveCard, /Accéder au direct 24h/);
  assert.doesNotMatch(rtveCard, /youtube\.com|load-stream/);
  assert.match(html, /https:\/\/www\.vrt\.be\/vrtnws\/nl\/kijk\//);
  assert.match(html, /https:\/\/www\.raiplay\.it\/dirette\/rainews24/);
  assert.match(html, /https:\/\/www\.tagesschau\.de\/multimedia\/livestreams\//);
  assert.match(serviceWorker, /veille-shell-v3/);
});

test("service worker serves the last successful news response offline", async () => {
  const handlers = new Map();
  const store = new Map();
  let fetchImpl = async () => Response.json({ articles: [{ id: "fresh" }], fetchedAt: "2026-10-21T00:00:00Z" });
  const cache = {
    async match(request) {
      return store.get(request.url);
    },
    async put(request, response) {
      store.set(request.url, response);
    },
    async addAll() {},
  };
  const caches = {
    async open() {
      return cache;
    },
    async match(request) {
      return cache.match(request);
    },
    async keys() {
      return ["veille-shell-v1", "veille-feed-v1"];
    },
    async delete() {
      return true;
    },
  };
  const self = {
    location: { origin: "https://veille.test" },
    clients: { claim: async () => {} },
    addEventListener(name, callback) {
      handlers.set(name, callback);
    },
    skipWaiting: async () => {},
  };
  const source = await readFile(new URL("service-worker.js", root), "utf8");
  runInNewContext(source, { self, caches, fetch: (...args) => fetchImpl(...args), URL, Response, Headers });

  const request = new Request("https://veille.test/api/veille", {
    headers: { Accept: "application/json" },
  });
  const fetchThroughWorker = async () => {
    let responsePromise;
    handlers.get("fetch")({
      request,
      respondWith(promise) {
        responsePromise = promise;
      },
    });
    return responsePromise;
  };

  const onlineResponse = await fetchThroughWorker();
  assert.equal(onlineResponse.status, 200);
  assert.deepEqual(await onlineResponse.json(), { articles: [{ id: "fresh" }], fetchedAt: "2026-10-21T00:00:00Z" });

  fetchImpl = async () => {
    throw new TypeError("offline");
  };
  const offlineResponse = await fetchThroughWorker();
  assert.equal(offlineResponse.status, 200);
  assert.equal(offlineResponse.headers.get("X-PWA-Offline"), "true");
  assert.deepEqual(await offlineResponse.json(), { articles: [{ id: "fresh" }], fetchedAt: "2026-10-21T00:00:00Z" });
});

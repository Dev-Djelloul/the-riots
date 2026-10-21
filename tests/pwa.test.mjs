import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("PWA manifest points to an existing scalable app icon", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", root), "utf8"));

  assert.equal(manifest.name, "Veille — événements en France");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons[0].sizes, "any");
  assert.equal(manifest.icons[0].purpose, "any maskable");
  await readFile(new URL(manifest.icons[0].src.slice(1), root), "utf8");
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

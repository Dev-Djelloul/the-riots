import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { onRequestGet } from "../functions/api/archive.js";
import { EUROPE_COUNTRIES } from "../europe-countries.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function createKv() {
  const store = new Map();
  return {
    store,
    async get(key) {
      return store.has(key) ? JSON.parse(store.get(key)) : null;
    },
    async put(key, value) {
      store.set(key, value);
    },
  };
}

function gnewsResponse(articles) {
  return Response.json({ articles });
}

const request = (date, country = "ES") => new Request(
  `https://example.test/api/archive?date=${date}${country ? `&country=${country}` : ""}`,
);

test("mémorise un jour GNews terminé et le relit depuis KV sans nouvelle requête", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return gnewsResponse([{
      title: "Des manifestants défilent à Madrid",
      description: "Manifestation contre la crise du logement",
      url: "https://example.test/madrid",
      publishedAt: "2026-10-01T10:00:00Z",
      source: { name: "Exemple" },
    }]);
  };
  const HISTORY = createKv();
  const env = { HISTORY, GNEWS_API_KEY: "secret" };

  const first = await (await onRequestGet({ request: request("2026-10-01"), env })).json();
  assert.equal(first.source, "external");
  assert.equal(first.provider, "gnews");
  assert.ok(first.articles.length >= 1);
  assert.equal(calls, 1);
  assert.ok(HISTORY.store.has("archive-country:2026-10-01:ES"));

  const second = await (await onRequestGet({ request: request("2026-10-01"), env })).json();
  assert.equal(second.source, "history");
  assert.equal(second.articles.length, first.articles.length);
  assert.equal(calls, 1);
});

test("mémorise aussi un jour terminé sans article pour ne plus consommer de quota", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return gnewsResponse([]);
  };
  const HISTORY = createKv();
  const env = { HISTORY, GNEWS_API_KEY: "secret" };

  const first = await (await onRequestGet({ request: request("2026-09-15"), env })).json();
  assert.equal(first.articles.length, 0);
  assert.equal(calls, 1);

  const second = await (await onRequestGet({ request: request("2026-09-15"), env })).json();
  assert.equal(second.source, "history");
  assert.equal(calls, 1);
});

test("ne mémorise pas un jour récent ni un jour partiellement en erreur", async () => {
  globalThis.fetch = async () => gnewsResponse([]);
  const recentHistory = createKv();
  const today = new Date().toISOString().slice(0, 10);
  await onRequestGet({ request: request(today, "ES"), env: { HISTORY: recentHistory, GNEWS_API_KEY: "secret" } });
  assert.equal(recentHistory.store.has(`archive:${today}`), false);

  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return calls === 1 ? new Response("quota", { status: 403 }) : gnewsResponse([]);
  };
  const partialHistory = createKv();
  await onRequestGet({ request: request("2026-09-10", "ES"), env: { HISTORY: partialHistory, GNEWS_API_KEY: "secret" } });
  assert.equal(partialHistory.store.has("archive-country:2026-09-10:ES"), false);
});

test("refuse une date invalide", async () => {
  const response = await onRequestGet({ request: request("2026-13-40"), env: {} });
  assert.equal(response.status, 400);
});

test("refuse un code pays absent du registre européen", async () => {
  const response = await onRequestGet({
    request: new Request("https://example.test/api/archive?date=2026-09-01&country=ZZ"),
    env: {},
  });
  assert.equal(response.status, 400);
});

test("relit les résultats de la collecte européenne pays par pays depuis KV", async () => {
  const HISTORY = createKv();
  HISTORY.store.set("archive:2026-09-01", "[]");
  HISTORY.store.set("coverage:2026-09-01:GR", JSON.stringify([{
    id: "greek-article",
    title: "Manifestation à Athènes",
    link: "https://example.test/athens",
    publishedAt: "2026-09-01T10:00:00Z",
    countryCode: "GR",
  }]));

  const result = await (await onRequestGet({
    request: request("2026-09-01", ""),
    env: { HISTORY },
  })).json();
  assert.equal(result.source, "scheduled-collection");
  assert.equal(result.available, 1);
  assert.equal(result.total, EUROPE_COUNTRIES.length);
  assert.equal(result.articles[0].countryCode, "GR");
});

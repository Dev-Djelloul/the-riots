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

test("recherche et mémorise une date ancienne en une requête GDELT européenne", async () => {
  let calls = 0;
  globalThis.fetch = async (input) => {
    calls += 1;
    const url = new URL(String(input));
    assert.equal(url.hostname, "api.gdeltproject.org");
    const query = url.searchParams.get("query");
    const articles = [];
    if (query.includes("sourcecountry:GR")) {
      articles.push({
        url: "https://example.test/athens",
        title: "Protest in Athens, Greece",
        seendate: "20260915T100000Z",
        domain: "example.test",
        sourcecountry: "Greece",
      });
    }
    if (query.includes("sourcecountry:UK")) {
      articles.push({
        url: "https://example.test/london",
        title: "Demonstration in London",
        seendate: "20260915T110000Z",
        domain: "example.test",
        sourcecountry: "United Kingdom",
      });
    }
    return Response.json({
      articles,
    });
  };
  const HISTORY = createKv();
  const env = { HISTORY };

  const firstResponse = await onRequestGet({ request: request("2026-09-15", ""), env });
  assert.equal(firstResponse.status, 200);
  const first = await firstResponse.json();
  assert.equal(first.provider, "gdelt");
  assert.equal(first.source, "external");
  assert.equal(first.available, 1);
  assert.equal(first.articles.length, 2);
  assert.deepEqual(first.articles.map(({ countryCode }) => countryCode).sort(), ["GB", "GR"]);
  assert.ok(HISTORY.store.has("archive:2026-09-15"));

  const second = await (await onRequestGet({ request: request("2026-09-15", ""), env })).json();
  assert.equal(second.source, "history");
  assert.equal(second.articles.length, 2);
  assert.equal(calls, 1);
});

test("inclut toute l’Europe dans une requête GDELT même sans archive précollectée", async () => {
  let calls = 0;
  const sourceQueries = [];
  globalThis.fetch = async (input) => {
    calls += 1;
    const url = new URL(String(input));
    assert.equal(url.hostname, "api.gdeltproject.org");
    const query = url.searchParams.get("query");
    sourceQueries.push(query);
    if (!query.includes("sourcecountry:GR")) return Response.json({ articles: [] });
    return Response.json({
      articles: [{
        url: "https://example.test/greece-story",
        title: "Greek newspapers report on a major protest",
        seendate: "20260914T200000Z",
        domain: "example.test",
        sourcecountry: "Greece",
      }],
    });
  };
  const HISTORY = createKv();
  const response = await onRequestGet({
    request: request("2026-09-14", ""),
    env: { HISTORY },
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.provider, "gdelt");
  assert.equal(result.articles.length, 1);
  assert.equal(result.articles[0].countryCode, "GR");
  assert.equal(calls, 1);
  assert.equal(sourceQueries.length, 1);
  assert.ok(sourceQueries[0].includes("sourcecountry:UK"));
  assert.ok(sourceQueries[0].includes("sourcecountry:UP"));
});

test("renvoie une erreur explicite si aucune source ne répond à la recherche européenne", async () => {
  globalThis.fetch = async () => new Response("indisponible", { status: 503 });
  const response = await onRequestGet({
    request: request("2026-09-15", ""),
    env: { HISTORY: createKv() },
  });
  assert.equal(response.status, 503);
  const result = await response.json();
  assert.equal(result.provider, "unavailable");
  assert.equal(result.available, 0);
  assert.ok(result.errors.some((error) => error.includes("GDELT HTTP 503")));
});

test("bascule sur les flux Google Actualités si GDELT est indisponible", async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls === 1) {
      return new Response("GDELT indisponible", { status: 503 });
    }
    return new Response(`
      <rss><channel><item>
        <title>Manifestation à Madrid - Source Test</title>
        <link>https://example.test/madrid-archive</link>
        <pubDate>Tue, 15 Sep 2026 10:00:00 GMT</pubDate>
        <source>Source Test</source>
      </item></channel></rss>
    `, { headers: { "Content-Type": "application/rss+xml" } });
  };
  const HISTORY = createKv();
  const response = await onRequestGet({
    request: request("2026-09-15", ""),
    env: { HISTORY },
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.provider, "google-news-rss");
  assert.equal(result.source, "external");
  assert.ok(result.articles.some((article) => article.link === "https://example.test/madrid-archive"));
  assert.equal(calls, 6);
  assert.ok(HISTORY.store.has("archive:2026-09-15"));
});

test("utilise une recherche GNews mondiale de repli et écarte les articles hors Europe", async () => {
  let calls = 0;
  globalThis.fetch = async (input) => {
    calls += 1;
    const url = new URL(String(input));
    if (url.hostname === "api.gdeltproject.org") {
      return new Response("GDELT indisponible", { status: 429 });
    }
    assert.equal(url.hostname, "gnews.io");
    assert.equal(url.searchParams.get("country"), null);
    assert.equal(url.searchParams.get("lang"), null);
    return gnewsResponse([
      {
        title: "Demonstration in Athens",
        description: "Protesters gathered in the Greek capital.",
        url: "https://example.test/athens",
        publishedAt: "2026-09-15T10:00:00Z",
        source: { name: "Example Europe" },
      },
      {
        title: "Demonstration in New York",
        description: "Protesters gathered in the United States.",
        url: "https://example.test/new-york",
        publishedAt: "2026-09-15T11:00:00Z",
        source: { name: "Example US" },
      },
    ]);
  };
  const HISTORY = createKv();

  const response = await onRequestGet({
    request: request("2026-09-15", ""),
    env: { HISTORY, GNEWS_API_KEY: "secret" },
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.provider, "gnews");
  assert.equal(result.articles.length, 1);
  assert.equal(result.articles[0].countryCode, "GR");
  assert.equal(calls, 2);
  assert.ok(HISTORY.store.has("archive:2026-09-15"));
});

test("la recherche tchèque conserve ses mots-clés locaux et ne localise pas les articles étrangers", async () => {
  let calls = 0;
  globalThis.fetch = async (input) => {
    calls += 1;
    const url = new URL(String(input));
    assert.equal(url.hostname, "gnews.io");
    assert.equal(url.searchParams.get("country"), "cz");
    assert.equal(url.searchParams.get("lang"), null);
    assert.match(url.searchParams.get("q"), /demonstrace/);
    assert.doesNotMatch(url.searchParams.get("q"), /demonstration OR strike/);
    return gnewsResponse([
      {
        title: "Mumbai Airport Mosque Row: Kirit Somaiya, BJP Workers Taken Into Custody",
        description: "A protest near Terminal 2 in Mumbai, India.",
        url: "https://example.test/mumbai",
        publishedAt: "2026-09-15T10:00:00Z",
        source: { name: "Example India" },
      },
      {
        title: "Demonstration in Prague over public services",
        description: "Protesters gathered in the Czech capital.",
        url: "https://example.test/prague",
        publishedAt: "2026-09-15T11:00:00Z",
        source: { name: "Example Czechia" },
      },
    ]);
  };
  const HISTORY = createKv();

  const response = await onRequestGet({
    request: request("2026-09-15", "CZ"),
    env: { HISTORY, GNEWS_API_KEY: "secret" },
  });
  const result = await response.json();
  const localArticle = result.articles.find((article) => article.link === "https://example.test/prague");

  assert.equal(response.status, 200);
  assert.equal(result.provider, "gnews");
  assert.equal(calls, 1);
  assert.equal(result.articles.some((article) => article.link === "https://example.test/mumbai"), false);
  assert.ok(localArticle);
  assert.equal(localArticle.countryCode, "CZ");
  assert.equal(localArticle.countryCodeBasis, "place-mention");
});

test("retire la fausse localisation des anciennes entrées de collecte en cache", async () => {
  const HISTORY = createKv();
  HISTORY.store.set("coverage:2026-09-15:CZ", JSON.stringify([{
    id: "old-india-article",
    title: "Protest in Mumbai, India",
    link: "https://example.test/old-india",
    publishedAt: "2026-09-15T10:00:00Z",
    countryCode: "CZ",
    countryCodeBasis: "search-country",
  }]));

  const response = await onRequestGet({
    request: request("2026-09-15", "CZ"),
    env: { HISTORY },
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.source, "scheduled-collection");
  assert.equal(result.articles.length, 0);
});

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { onRequestGet } from "../functions/api/veille.js";

const originalFetch = globalThis.fetch;
const now = new Date().toUTCString();

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("agrège et attribue les articles récents des sept flux", async () => {
  globalThis.fetch = async () => new Response(
    `<rss><channel><item><title>Manifestation à Lyon : actualité &amp; contexte</title><link>https://media.example/article</link><pubDate>${now}</pubDate><description><![CDATA[<p>Rassemblement rapporté dans la ville.</p>]]></description></item></channel></rss>`,
    { status: 200 },
  );

  const response = await onRequestGet();
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.sources.length, 7);
  assert.equal(payload.articles.length, 7);
  assert.equal(payload.articles[0].title, "Manifestation à Lyon : actualité & contexte");
  assert.equal(payload.articles[0].description, "Rassemblement rapporté dans la ville.");
  assert.equal(payload.articles[0].city, "Lyon");
  assert.equal(payload.articles[0].type, "rassemblement");
  assert.equal(payload.articles[0].sourceName, "franceinfo");
  assert.equal(payload.articles[0].link, "https://media.example/article");
});

test("ignore les articles anciens, hors sujet et les liens non HTTP", async () => {
  const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toUTCString();
  globalThis.fetch = async () => new Response(
    `<rss><channel>
      <item><title>Manifestation ancienne</title><link>https://media.example/old</link><pubDate>${oldDate}</pubDate></item>
      <item><title>Recette du jour</title><link>https://media.example/irrelevant</link><pubDate>${now}</pubDate></item>
      <item><title>Manifestation à Paris</title><link>javascript:alert(1)</link><pubDate>${now}</pubDate></item>
    </channel></rss>`,
    { status: 200 },
  );

  const response = await onRequestGet();
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.articles.length, 0);
});

test("signale une indisponibilité explicite quand tous les flux échouent", async () => {
  const originalWarn = console.warn;
  console.warn = () => {};
  globalThis.fetch = async () => new Response("", { status: 503 });
  try {
    const response = await onRequestGet();
    const payload = await response.json();
    assert.equal(response.status, 503);
    assert.equal(payload.articles.length, 0);
    assert.ok(payload.sources.every((source) => source.status === "indisponible"));
    assert.match(payload.warning, /indisponible/);
  } finally {
    console.warn = originalWarn;
  }
});

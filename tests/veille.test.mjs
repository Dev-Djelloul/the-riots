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
    `<rss><channel><item><title>Manifestation à Lyon : actualité &amp; contexte</title><link>https://media.example/article</link><pubDate>${now}</pubDate><description><![CDATA[<p>Rassemblement rapporté dans la ville.</p>]]></description><media:thumbnail url="https://media.example/image.jpg" /></item></channel></rss>`,
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
  assert.equal(payload.articles[0].image, "https://media.example/image.jpg");
  assert.deepEqual(payload.articles[0].position, [45.764, 4.8357]);
});

test("conserve l’historique RSS disponible et ignore les articles hors sujet et liens non HTTP", async () => {
  const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toUTCString();
  globalThis.fetch = async () => new Response(
    `<rss><channel>
      <item><title>Manifestation ancienne à Marseille</title><link>https://media.example/old</link><pubDate>${oldDate}</pubDate></item>
      <item><title>Recette du jour</title><link>https://media.example/irrelevant</link><pubDate>${now}</pubDate></item>
      <item><title>Manifestation à Paris</title><link>javascript:alert(1)</link><pubDate>${now}</pubDate></item>
      <item><title>Manifestation à Lyon</title><link>https://media.example/image-test</link><pubDate>${now}</pubDate><media:thumbnail url="http://media.example/image.jpg" /></item>
    </channel></rss>`,
    { status: 200 },
  );

  const response = await onRequestGet();
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.articles.length, 14);
  assert.ok(payload.articles.some((article) => article.title === "Manifestation ancienne à Marseille"));
  assert.ok(payload.articles.every((article) => article.image === null));
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

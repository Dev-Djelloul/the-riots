import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { onRequestGet } from "../functions/api/veille.js";

const originalFetch = globalThis.fetch;
const now = new Date().toUTCString();

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("agrège les flux français et les sources des quatre pays pilotes", async () => {
  globalThis.fetch = async () => new Response(
    `<rss><channel><item><title>Manifestation à Lyon : actualité &amp; contexte</title><link>https://media.example/article</link><pubDate>${now}</pubDate><description><![CDATA[<p>Rassemblement rapporté dans la ville.</p>]]></description><media:thumbnail url="https://media.example/image.jpg" /></item></channel></rss>`,
    { status: 200 },
  );

  const response = await onRequestGet();
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.sources.length, 26);
  assert.equal(payload.articles.length, 26);
  assert.ok(payload.sources.some((source) => source.id === "rfi"));
  assert.ok(payload.sources.some((source) => source.id === "le-figaro"));
  assert.ok(payload.sources.some((source) => source.id === "sud-ouest"));
  assert.ok(payload.sources.some((source) => source.id === "france-inter"));
  assert.ok(payload.sources.some((source) => source.id === "lexpress"));
  assert.ok(payload.sources.some((source) => source.id === "challenges"));
  assert.ok(payload.sources.some((source) => source.id === "vrt"));
  assert.ok(payload.sources.some((source) => source.id === "rtbf"));
  assert.ok(payload.sources.some((source) => source.id === "elpais"));
  assert.ok(payload.sources.some((source) => source.id === "repubblica"));
  assert.ok(payload.sources.some((source) => source.id === "tagesschau"));
  assert.equal(payload.articles[0].title, "Manifestation à Lyon : actualité & contexte");
  assert.equal(payload.articles[0].description, "Rassemblement rapporté dans la ville.");
  assert.equal(payload.articles[0].city, "Lyon");
  assert.equal(payload.articles[0].countryCode, "FR");
  assert.equal(payload.articles[0].type, "rassemblement");
  assert.equal(payload.articles[0].sourceName, "franceinfo");
  assert.equal(payload.articles[0].link, "https://media.example/article");
  assert.equal(payload.articles[0].image, "https://media.example/image.jpg");
  assert.deepEqual(payload.articles[0].position, [45.764, 4.8357]);
});

test("analyse un flux Atom VRT et localise une manifestation à Bruxelles", async () => {
  globalThis.fetch = async (input) => {
    if (!String(input).includes("vrt.be")) return new Response("<rss><channel></channel></rss>");
    return new Response(
      `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title type="text">Betoging in Brussel houdt verkeer tegen</title><link href="https://vrtnws.be/article/123" rel="alternate" type="text/html"/><published>${new Date().toISOString()}</published><summary type="text">De manifestatie trekt door het centrum.</summary></entry></feed>`,
      { status: 200 },
    );
  };

  const response = await onRequestGet();
  const payload = await response.json();
  const article = payload.articles.find((item) => item.sourceId === "vrt");

  assert.equal(response.status, 200);
  assert.ok(article);
  assert.equal(article.city, "Bruxelles");
  assert.equal(article.countryCode, "BE");
  assert.equal(article.type, "rassemblement");
  assert.equal(article.link, "https://vrtnws.be/article/123");
  assert.equal(article.description, "De manifestatie trekt door het centrum.");
});

test("classe des titres espagnols, italiens et allemands avec leur ville et pays", async () => {
  const samples = [
    ["elpais.com", "Manifestación en Barcelona por la vivienda", "https://elpais.com/article/es", "Barcelona", "ES"],
    ["repubblica.it", "Sciopero a Milano: corteo in centro", "https://www.repubblica.it/article/it", "Milan", "IT"],
    ["tagesschau.de", "Demonstration in Berlin angekündigt", "https://www.tagesschau.de/article/de", "Berlin", "DE"],
  ];
  globalThis.fetch = async (input) => {
    const sample = samples.find(([host]) => String(input).includes(host));
    if (!sample) return new Response("<rss><channel></channel></rss>");
    const [, title, link] = sample;
    return new Response(
      `<rss><channel><item><title>${title}</title><link>${link}</link><pubDate>${now}</pubDate></item></channel></rss>`,
      { status: 200 },
    );
  };

  const response = await onRequestGet();
  const payload = await response.json();
  for (const [, , link, city, countryCode] of samples) {
    const article = payload.articles.find((item) => item.link === link);
    assert.ok(article, `article ${link} should be indexed`);
    assert.equal(article.city, city);
    assert.equal(article.countryCode, countryCode);
    assert.equal(article.type, "rassemblement");
  }
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
  assert.equal(payload.articles.length, payload.sources.length * 2);
  assert.ok(payload.articles.some((article) => article.title === "Manifestation ancienne à Marseille"));
  assert.ok(payload.articles.every((article) => article.image === null));
});

test("utilise la date du permalien du Parisien et la marque comme estimée", async () => {
  const date = new Date();
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const articleLink = `https://www.leparisien.fr/france/manifestation-a-paris-${day}-${month}-${year}-ABCDEFGHIJKLMN.php`;
  globalThis.fetch = async (input) => {
    if (String(input).includes("feeds.leparisien.fr")) {
      return new Response(`<rss><channel><item><title>Manifestation à Paris</title><link>${articleLink}</link></item></channel></rss>`, { status: 200 });
    }
    return new Response("<rss><channel></channel></rss>", { status: 200 });
  };

  const response = await onRequestGet();
  const payload = await response.json();
  const article = payload.articles.find((item) => item.sourceId === "le-parisien");

  assert.equal(response.status, 200);
  assert.ok(article);
  assert.equal(article.datePrecision, "day");
  assert.equal(article.publishedAt, new Date(Date.UTC(year, date.getUTCMonth(), date.getUTCDate(), 12)).toISOString());
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

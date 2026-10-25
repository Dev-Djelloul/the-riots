import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { onRequestGet, onRequestPost } from "../functions/api/veille.js";

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
  assert.equal(article.countryCodeBasis, "place-mention");
  assert.deepEqual(article.placeMention, {
    name: "Bruxelles",
    region: null,
    countryCode: "BE",
    coordinates: [50.8503, 4.3517],
    precision: "city",
    role: "event-candidate",
    confidence: "medium",
    evidence: {
      field: "title",
      text: "Betoging in Brussel houdt verkeer tegen",
      signal: "location-cue",
      confidence: "medium",
    },
  });
  assert.equal(article.type, "rassemblement");
  assert.equal(article.link, "https://vrtnws.be/article/123");
  assert.equal(article.description, "De manifestatie trekt door het centrum.");
});

test("n’infère pas une ville européenne depuis un nom en tête de titre sans indice de lieu", async () => {
  globalThis.fetch = async (input) => {
    if (!String(input).includes("franceinfo.fr")) return new Response("<rss><channel></channel></rss>");
    return new Response(
      `<rss><channel><item><title>Nice en forme avant une manifestation nationale</title><link>https://media.example/nice-club</link><pubDate>${now}</pubDate><description>Un mouvement social sera suivi ailleurs.</description></item></channel></rss>`,
      { status: 200 },
    );
  };
  const response = await onRequestGet();
  const payload = await response.json();
  const article = payload.articles.find((item) => item.link === "https://media.example/nice-club");
  assert.ok(article);
  assert.equal(article.city, null);
});

test("ne confond pas une dateline avec le lieu d’une manifestation située ailleurs", async () => {
  globalThis.fetch = async (input) => {
    if (!String(input).includes("franceinfo.fr")) return new Response("<rss><channel></channel></rss>");
    return new Response(
      `<rss><channel><item><title>Berlin : les ministres réagissent aux manifestations à Paris</title><link>https://media.example/berlin-paris</link><pubDate>${now}</pubDate></item></channel></rss>`,
      { status: 200 },
    );
  };
  const response = await onRequestGet();
  const payload = await response.json();
  const article = payload.articles.find((item) => item.link === "https://media.example/berlin-paris");
  assert.ok(article);
  assert.equal(article.city, "Paris");
  assert.equal(article.placeMention.role, "event-candidate");
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
    assert.equal(article.placeMention.name, city);
    assert.equal(article.placeMention.countryCode, countryCode);
    assert.equal(article.placeMention.evidence.field, "title");
    assert.equal(article.placeMention.role, "event-candidate");
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

test("exige un contexte pour les termes ambigus et écarte les faux positifs", async () => {
  const items = [
    ["Victoria’s Secret : la vie ressemblait à une fête au défilé de Los Angeles", "https://media.example/fashion"],
    ["Le Rassemblement national annonce son programme à Paris", "https://media.example/rn"],
    ["Défilé syndical à Lyon : la police interpelle deux personnes", "https://media.example/syndical"],
    ["Mobilisation contre la réforme à Marseille", "https://media.example/mobilisation"],
    ["Manifestation à Bordeaux", "https://media.example/strong"],
  ];
  globalThis.fetch = async () => new Response(
    `<rss><channel>${items.map(([title, link]) => `<item><title>${title}</title><link>${link}</link><pubDate>${now}</pubDate></item>`).join("")}</channel></rss>`,
    { status: 200 },
  );

  const payload = await (await onRequestGet()).json();
  const links = new Set(payload.articles.map((article) => article.link));
  assert.equal(links.has("https://media.example/fashion"), false);
  assert.equal(links.has("https://media.example/rn"), false);
  assert.equal(links.has("https://media.example/syndical"), true);
  assert.equal(links.has("https://media.example/mobilisation"), true);
  assert.equal(links.has("https://media.example/strong"), true);
});

test("délègue les cas ambigus à Workers AI et retombe sur les règles en cas d’échec", async () => {
  globalThis.fetch = async () => new Response(
    `<rss><channel><item><title>Rassemblement devant la mairie de Nantes</title><link>https://media.example/ambigu</link><pubDate>${now}</pubDate></item></channel></rss>`,
    { status: 200 },
  );

  const withoutAi = await (await onRequestGet({ env: {} })).json();
  assert.equal(withoutAi.articles.length, 0);

  let prompt = "";
  const accepting = { run: async (_model, input) => { prompt = input.messages[1].content; return { response: "[0]" }; } };
  const accepted = await (await onRequestGet({ env: { AI: accepting } })).json();
  assert.match(prompt, /Rassemblement devant la mairie de Nantes/);
  assert.ok(accepted.articles.length > 0);
  assert.ok(accepted.articles.every((article) => article.classifiedBy === "ai" && !("candidate" in article)));

  const failing = { run: async () => { throw new Error("indisponible"); } };
  const fallback = await (await onRequestGet({ env: { AI: failing } })).json();
  assert.equal(fallback.articles.length, 0);
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

test("ajoute un flux personnel HTTPS en Tchéquie, filtre ses articles et ne met pas la réponse en cache", async () => {
  let customRedirectMode;
  globalThis.fetch = async (input, options) => {
    if (String(input) === "https://local-media.example/rss.xml") {
      customRedirectMode = options.redirect;
      return new Response(
        `<rss><channel><item><title>Manifestation nationale annoncée</title><link>https://local-media.example/article</link><pubDate>${now}</pubDate></item></channel></rss>`,
        { status: 200 },
      );
    }
    return new Response("<rss><channel></channel></rss>", { status: 200 });
  };
  const request = new Request("https://veille.example/api/veille", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customFeeds: [{ id: "local-media", name: "Média local", feed: "https://local-media.example/rss.xml", countryCode: "CZ" }],
    }),
  });

  const response = await onRequestPost({ request });
  const payload = await response.json();
  const article = payload.articles.find((item) => item.sourceId === "custom-local-media");
  const source = payload.sources.find((item) => item.id === "custom-local-media");

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(customRedirectMode, "manual");
  assert.ok(article);
  assert.equal(article.countryCode, "CZ");
  assert.equal(source.custom, true);
  assert.equal(source.name, "Média local");
});

test("refuse les flux personnels non HTTPS et les adresses IP avant toute requête réseau", async () => {
  let fetchCount = 0;
  globalThis.fetch = async () => {
    fetchCount += 1;
    return new Response("<rss><channel></channel></rss>");
  };
  const request = new Request("https://veille.example/api/veille", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customFeeds: [{ id: "private", name: "Local", feed: "https://127.0.0.1/feed.xml", countryCode: "" }],
    }),
  });
  const response = await onRequestPost({ request });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.match(payload.error, /invalide/);
  assert.equal(fetchCount, 0);
});

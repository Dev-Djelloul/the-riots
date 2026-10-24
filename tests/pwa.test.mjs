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

test("site-wide zoom is reset to 100 percent and French live streams use two columns", async () => {
  const stylesheet = await readFile(new URL("styles.css", root), "utf8");

  assert.match(stylesheet, /body\s*\{[^}]*zoom:\s*1;/s);
  assert.match(stylesheet, /body\s*\{[^}]*min-width:\s*320px;/s);
  assert.match(stylesheet, /\.live-board:not\(\.europe-live-board\) \.live-stream-card\s*\{\s*grid-column:\s*span 6;/);
});

test("coverage feed spans the page below the full-width map", async () => {
  const stylesheet = await readFile(new URL("styles.css", root), "utf8");

  assert.match(stylesheet, /\.workspace\s*\{[^}]*grid-template-columns:\s*300px minmax\(0,\s*1fr\);[^}]*grid-template-rows:[^}]*;/s);
  assert.match(stylesheet, /\.map-panel\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1;/s);
  assert.match(stylesheet, /\.feed-panel\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*grid-row:\s*2;[^}]*min-height:\s*600px;/s);
  assert.match(stylesheet, /@media \(max-width: 600px\)\s*\{[\s\S]*?\.workspace\s*\{\s*display:\s*flex;/);
});

test("country flags, publisher marks and a return-to-top button are available", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const app = await readFile(new URL("app.js", root), "utf8");
  const stylesheet = await readFile(new URL("styles.css", root), "utf8");
  const sourceIds = [
    "franceinfo", "bfmtv", "cnews", "le-monde", "france-24", "rfi", "le-figaro",
    "liberation", "ouest-france", "sud-ouest", "20-minutes", "la-croix", "humanite",
    "la-depeche", "le-parisien", "france-inter", "lexpress", "challenges", "vrt",
    "rtbf", "elpais", "eldiario", "rainews", "repubblica", "tagesschau", "dw-de",
  ];

  for (const [code, flag] of Object.entries({ BE: "🇧🇪", DE: "🇩🇪", ES: "🇪🇸", FR: "🇫🇷", IT: "🇮🇹" })) {
    assert.ok(app.includes(`${code}: "${flag}"`), `${code} should have a country flag`);
  }
  for (const sourceId of sourceIds) {
    assert.ok(
      app.includes(`${sourceId}: { label:`) || app.includes(`"${sourceId}": { label:`),
      `${sourceId} should have a publisher mark`,
    );
  }
  assert.match(app, /createCountryFlag\(group\.countryCode\)/);
  assert.match(app, /createCountryLabel\(code, "coverage-country-name"\)/);
  assert.match(app, /createPublisherMark\(article\.sourceId, article\.sourceName\)/);
  assert.match(app, /createPublisherMark\(source\.id, source\.name, "publisher-mark-small"\)/);
  assert.match(app, /mark\.append\(logo\);\s*logo\.src = `\/icons\/press\/\$\{sourceId\}\.png`;/);
  assert.match(app, /logo\.addEventListener\("load", \(\) => \{\s*mark\.classList\.add\("has-logo"\);\s*mark\.replaceChildren\(logo\);/);
  assert.match(app, /logo\.addEventListener\("error", \(\) => logo\.remove\(\)/);
  assert.match(html, /id="back-to-top"[^>]*aria-label="Retour vers le haut"/);
  assert.match(app, /backToTopButton\.hidden = window\.scrollY < 500/);
  assert.match(app, /window\.scrollTo\(\{\s*top: 0,\s*behavior: window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches \? "auto" : "smooth",\s*\}\)/s);
  assert.match(stylesheet, /\.back-to-top\s*\{[^}]*position:\s*fixed;/s);
  assert.match(app, /button\.id = "feed-jump-top"/);
  assert.match(app, /sections\.push\(createFeedJumpButton\(\)\)/);
  assert.match(stylesheet, /\.feed-jump-top\s*\{[^}]*grid-column:\s*1 \/ -1/);
});

test("personal alerts, saved articles and European coverage comparison are wired", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const app = await readFile(new URL("app.js", root), "utf8");
  const serviceWorker = await readFile(new URL("service-worker.js", root), "utf8");
  const readme = await readFile(new URL("README.md", root), "utf8");

  for (const id of ["alert-form", "alert-query", "alert-country", "alert-rules", "notification-permission", "saved-filter", "coverage-compare-list", "share-view", "custom-feed-form", "custom-feed-url", "trend-panel", "trend-period", "trend-type"]) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} should be present in the interface`);
  }
  assert.match(app, /processNewArticles\(state\.articles\)/);
  assert.match(app, /Notification\.requestPermission\(\)/);
  assert.match(app, /registration\.showNotification/);
  assert.match(app, /window\.isSecureContext/);
  assert.match(app, /isIOSWithoutInstalledApp/);
  assert.match(app, /toggleSavedArticle\(article\)/);
  assert.match(app, /getVisibleArticles\(\{ ignoreCountry: true \}\)/);
  assert.match(app, /history\.replaceState/);
  assert.match(html, /id="publication-date" type="date"/);
  assert.match(app, /state\.selectedDate = isValidDateOnly\(date\) \? date : ""/);
  assert.match(app, /selectedStart = new Date\(`\$\{state\.selectedDate\}T00:00:00`\)/);
  assert.match(app, /navigator\.clipboard\.writeText/);
  assert.match(app, /function renderTrends\(\)/);
  assert.match(serviceWorker, /veille-shell-v20/);
  assert.match(readme, /À lire plus tard/);
  assert.match(readme, /alertes personnalisées/i);
  assert.match(readme, /Comparateur de couverture/);
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
  assert.match(app, /id: "UC7QZIf0dta-XPXsp9Hv4dTw"/);
  assert.match(app, /liveUrl: "https:\/\/www\.youtube\.com\/@rtvenoticias\/live"/);
  assert.match(app, /siteUrl: "https:\/\/www\.rtve\.es\/play\/videos\/directo\/24h\/"/);
  assert.match(html, /https:\/\/www\.youtube\.com\/@rtvenoticias\/live/);
  assert.match(html, /https:\/\/www\.rtve\.es\/play\/videos\/directo\/24h\//);
  assert.match(html, /https:\/\/auvio\.rtbf\.be\/direct\/info/);
  const rtveCard = html.match(/<article class="live-stream-card stream-featured" data-channel="rtve">([\s\S]*?)<\/article>/)?.[1];
  assert.ok(rtveCard);
  assert.match(rtveCard, /load-stream/);
  assert.match(rtveCard, /Ouvrir sur YouTube/);
  assert.match(html, /https:\/\/www\.vrt\.be\/vrtnws\/nl\/kijk\//);
  assert.match(html, /https:\/\/www\.raiplay\.it\/dirette\/rainews24/);
  assert.match(html, /https:\/\/www\.tagesschau\.de\/multimedia\/livestreams\//);
  assert.match(serviceWorker, /veille-shell-v20/);
  assert.match(app, /card\.dataset\.type/);
  assert.match(html, /id="group-by"/);
  assert.match(app, /function renderGroupedFeed\(/);
  assert.match(app, /function getMediaCategory\(/);
  assert.match(app, /function getArticleRegion\(/);
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

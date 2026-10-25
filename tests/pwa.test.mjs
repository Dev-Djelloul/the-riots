import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("PWA manifest points to an existing scalable app icon", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.webmanifest", root), "utf8"));
  const favicon = await readFile(new URL("favicon.ico", root));

  assert.equal(manifest.name, "Veille — événements en France et en Europe");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons[0].sizes, "any");
  assert.equal(manifest.icons[0].purpose, "any maskable");
  assert.deepEqual([...favicon.subarray(0, 4)], [0, 0, 1, 0]);
  await readFile(new URL(manifest.icons[0].src.slice(1), root), "utf8");
});

test("site-wide zoom is reset to 100 percent and French live streams use two columns", async () => {
  const stylesheet = await readFile(new URL("styles.css", root), "utf8");

  assert.match(stylesheet, /body\s*\{[^}]*zoom:\s*1;/s);
  assert.match(stylesheet, /body\s*\{[^}]*min-width:\s*320px;/s);
  assert.match(stylesheet, /\.live-board:not\(\.europe-live-board\) \.live-stream-card\s*\{\s*grid-column:\s*span 6;/);
});

test("map supports touch gestures, keyboard and zoom/recenter controls", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const app = await readFile(new URL("app.js", root), "utf8");
  const stylesheet = await readFile(new URL("styles.css", root), "utf8");

  assert.match(app, /zoomControl:\s*false,\s*scrollWheelZoom:\s*true,\s*touchZoom:\s*true,\s*dragging:\s*true,\s*doubleClickZoom:\s*true,\s*keyboard:\s*true/s);
  assert.match(app, /addButton\("\+", "Zoom avant"/);
  assert.match(app, /addButton\("−", "Zoom arrière"/);
  assert.match(app, /addButton\("⌂", "Recentrer sur la zone affichée", fitMapToCurrentArea\)/);
  assert.doesNotMatch(html, /map-gesture-hint|PINCER À 2 DOIGTS · GLISSER POUR DÉPLACER/);
  assert.doesNotMatch(stylesheet, /\.map-gesture-hint/);
  assert.match(stylesheet, /\.map-navigation-button:focus-visible/);
});

test("Agora translates recent articles with an owl icon and linked citations", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const app = await readFile(new URL("app.js", root), "utf8");
  const stylesheet = await readFile(new URL("styles.css", root), "utf8");
  const worker = await readFile(new URL("service-worker.js", root), "utf8");
  const api = await readFile(new URL("functions/api/agora.js", root), "utf8");
  const feedApi = await readFile(new URL("functions/api/veille.js", root), "utf8");
  const readme = await readFile(new URL("README.md", root), "utf8");
  const owl = await readFile(new URL("icons/owl.svg", root), "utf8");

  assert.match(html, /id="agora-open"[^>]*aria-label="Ouvrir Agora/);
  assert.match(html, /id="agora-dialog"[^>]*aria-labelledby="agora-title"/);
  assert.match(html, /id="agora-messages"[^>]*role="log"/);
  assert.match(html, /id="agora-web-search" type="checkbox" checked/);
  assert.match(html, /id="agora-archive-toggle" type="checkbox"/);
  assert.match(html, /id="agora-archive-date" type="date" disabled/);
  assert.doesNotMatch(html, /peut entraîner des frais OpenRouter/);
  assert.ok(html.indexOf('id="agora-web-search"') < html.indexOf('id="agora-archive-toggle"'));
  assert.ok(html.indexOf('id="agora-archive-toggle"') < html.indexOf('id="agora-archive-date"'));
  assert.match(html, /rel="icon" href="\/favicon\.ico"/);
  assert.match(html, /property="og:image" content="https:\/\/the-riots\.digitalblueskye\.com\/icons\/veille-512\.png"/);
  assert.match(html, /id="agora-model-name"/);
  assert.match(html, /href="https:\/\/openrouter\.ai\/"[^>]*>OpenRouter ↗/);
  assert.doesNotMatch(html, /openrouter\.ai\/openai\/gpt-4o-mini/);
  assert.equal((html.match(/src="\/icons\/owl\.svg"/g) || []).length, 2);
  assert.equal(owl.trim(), '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="#000000"><g fill="none" stroke="#000000" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><ellipse cx="12" cy="9" rx="8" ry="7"/><path d="M12 9a4 4 0 1 1 8 0v12h-4C9.4 21 4 15.6 4 9a4 4 0 1 1 8 0v1M8 9h.01M16 9h.01"/><path d="M20 21a3.9 3.9 0 1 1 0-7.8m-10 6.2V22m4-1.15V22"/></g></svg>');
  assert.match(html, /data-agora-prompt="Fais un briefing/);
  assert.match(html, /aria-label="Briefing express des principaux événements"/);
  assert.match(html, /aria-label="Traduire les titres des articles non francophones"/);
  assert.match(html, /class="agora-model"[^>]*>[\s\S]*id="agora-model-name"[\s\S]*href="https:\/\/openrouter\.ai\/"/);
  assert.match(app, /fetch\("\/api\/agora"/);
  assert.match(app, /fetch\(`\/api\/archive\?date=/);
  assert.match(app, /\.slice\(0,\s*12\)/);
  assert.match(app, /agora-citation-preview/);
  assert.match(app, /source\.kind === "web" \? " agora-citation-preview--web"/);
  assert.match(app, /className = "agora-preview-description"/);
  assert.match(app, /Lieu mentionné, événement non confirmé/);
  assert.match(app, /event-candidate/);
  assert.match(app, /Indice dans le \$\{place\.evidence\.field/);
  assert.match(app, /if \(place\.role !== "event-candidate"\) continue/);
  assert.match(feedApi, /placeMention: matchedCity \? createPlaceMention\(matchedCity\) : null/);
  assert.match(feedApi, /countryCodeBasis/);
  assert.match(feedApi, /confidence: "low"/);
  assert.match(readme, /Cette confiance mesure la force du signal textuel/);
  assert.match(app, /positionAgoraPreview/);
  assert.match(app, /className = "agora-press-highlight"/);
  assert.match(app, /className = "agora-web-link"/);
  assert.match(app, /replace\(\/\[\*_`\]\/g, ""\)/);
  assert.match(app, /agora-response-heading/);
  assert.match(stylesheet, /\.agora-response-heading\s*\{/);
  assert.match(app, /data-agora-prompt/);
  assert.match(stylesheet, /\.agora-trigger\s*\{[^}]*position:\s*fixed;/s);
  assert.match(stylesheet, /\.agora-press-highlight\s*\{/);
  for (const color of ["#e7b76f", "#79bde0", "#72c6a4", "#e58b8b", "#b69be7"]) {
    assert.ok(stylesheet.includes(color), `Expected a distinct suggestion color ${color}`);
  }
  assert.match(stylesheet, /--prompt-color\) 34%, #1d1e19/);
  assert.match(stylesheet, /\.agora-citation:hover \.agora-citation-preview/);
  assert.match(stylesheet, /\.agora-quick-prompts\s*\{[^}]*flex-wrap:\s*nowrap;[^}]*overflow-x:\s*auto;/);
  assert.match(stylesheet, /\.map-result-count--europe\s*\{[^}]*color:\s*#e7bd78;/);
  assert.match(api, /Tu es Agora/);
  assert.match(api, /MAX_ARTICLES = 24/);
  assert.match(api, /N’invente jamais de référence/);
  assert.match(api, /image: suppliedArticles\[reference - 1\]\.image/);
  assert.match(api, /MAX_BODY_BYTES/);
  assert.match(api, /openrouter\/auto/);
  assert.match(api, /openrouter:web_search/);
  assert.doesNotMatch(api, /getArchiveDay/);
  assert.match(api, /X-OpenRouter-Title/);
  assert.match(api, /OPENROUTER_APP_URL/);
  assert.match(api, /max_tokens:\s*3_000/);
  assert.match(api, /incomplete:\s*choice\?\.finish_reason === "length"/);
  assert.match(api, /model: result\?\.model/);
  assert.match(app, /webSearch: agoraWebSearch\.checked/);
  assert.match(app, /archiveDate,/);
  assert.match(worker, /veille-shell-v35/);
  assert.ok(worker.includes('"/favicon.ico"'));
  assert.ok(worker.includes('"/icons/owl.svg"'));
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

  assert.match(app, /String\.fromCodePoint\(\.\.\.code\.split\(""\)\.map/);
  assert.match(app, /populateCountrySelectors\(\)/);
  assert.match(app, /EUROPE_COUNTRIES\.length/);
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
  assert.match(html, /id="day-calendar"/);
  assert.match(app, /function renderDayCalendar\(\)/);
  assert.match(app, /\/api\/archive\?date=/);
  assert.match(app, /if \(article\.archive\) return true;\s*const publishedAt = Date\.parse\(article\.publishedAt\);/);
  assert.match(app, /selectedStart = new Date\(`\$\{state\.selectedDate\}T00:00:00`\)/);
  assert.match(app, /navigator\.clipboard\.writeText/);
  assert.match(app, /function renderTrends\(\)/);
  assert.match(serviceWorker, /veille-shell-v35/);
  assert.ok(serviceWorker.includes('"/europe-countries.js"'));
  assert.match(readme, /À lire plus tard/);
  assert.match(readme, /alertes personnalisées/i);
  assert.match(readme, /Comparateur de couverture/);
});

test("European country coverage and media trends remain searchable and navigable", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const app = await readFile(new URL("app.js", root), "utf8");
  const stylesheet = await readFile(new URL("styles.css", root), "utf8");

  for (const id of ["coverage-search", "coverage-sort", "coverage-expand", "coverage-summary", "trend-country", "trend-summary"]) {
    assert.match(html, new RegExp(`id="${id}"`), `${id} should be present in the interface`);
  }
  assert.match(html, /aria-controls="coverage-compare-list"/);
  assert.match(app, /codes = codes\.filter\(\(code\) => totals\.get\(code\)\.articles > 0\)\.slice\(0, 8\)/);
  assert.match(app, /coverage-search"\)\.addEventListener\("input"/);
  assert.match(app, /trend-country"\)\.addEventListener\("change", renderTrends\)/);
  assert.match(app, /selectedCountry === "all"\s*\? dates\.map/);
  assert.match(stylesheet, /\.coverage-compare-list \{ display: grid; grid-template-columns: repeat\(2/);
  assert.match(stylesheet, /\.trend-chart \{ display: block; width: 100%; height: auto;/);
});

test("social and channel logos referenced by the page exist and are pre-cached", async () => {
  const html = await readFile(new URL("index.html", root), "utf8");
  const serviceWorker = await readFile(new URL("service-worker.js", root), "utf8");
  assert.ok(serviceWorker.includes('"/data/europe-countries.geojson"'));
  assert.match(serviceWorker, /url\.origin === "https:\/\/raw\.githubusercontent\.com"/);
  assert.match(serviceWorker, /url\.pathname === "\/johan\/world\.geo\.json\/master\/countries\.geo\.json"/);
  assert.match(serviceWorker, /\["basic", "cors"\]\.includes\(response\.type\)/);
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
  assert.match(serviceWorker, /veille-shell-v35/);
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

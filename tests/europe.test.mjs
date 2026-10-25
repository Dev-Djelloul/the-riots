import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fetchArchiveDay } from "../functions/api/veille.js";
import {
  combineEuropeBoundaries,
  EUROPE_CAPITALS,
  EUROPE_COUNTRIES,
  EUROPE_ISO3_CODES,
} from "../europe-countries.js";

test("recense les 46 membres du Conseil de l’Europe et la Biélorussie et la Russie", () => {
  const codes = EUROPE_COUNTRIES.map(({ code }) => code);
  assert.equal(codes.length, 48);
  assert.equal(new Set(codes).size, codes.length);
  assert.equal(EUROPE_COUNTRIES.filter(({ inCouncilOfEurope }) => inCouncilOfEurope !== false).length, 46);
  assert.ok(codes.includes("GB"));
  assert.ok(codes.includes("IE"));
  assert.ok(codes.includes("GR"));
  assert.ok(codes.includes("NO"));
  assert.ok(codes.includes("PL"));
  assert.ok(codes.includes("CZ"));
  assert.ok(codes.includes("BY"));
  assert.ok(codes.includes("RU"));
  assert.equal(EUROPE_ISO3_CODES.size, EUROPE_COUNTRIES.length);
  assert.deepEqual([...EUROPE_ISO3_CODES.values()].sort(), [...codes].sort());
  for (const { code, lang, query, center } of EUROPE_COUNTRIES) {
    assert.match(code, /^[A-Z]{2}$/);
    assert.match(lang, /^[a-z]{2}$/);
    assert.ok(query.length > 0);
    assert.equal(center.length, 2);
    if (code !== "FR") assert.ok(EUROPE_CAPITALS[code]?.length, `${code} should have capital aliases`);
  }
});

test("associe les frontières GeoJSON aux 48 pays suivis via leur code ISO alpha-3", () => {
  const worldFeatures = [...EUROPE_ISO3_CODES.keys()].map((id) => ({
    type: "Feature",
    id,
    properties: { name: id },
    geometry: { type: "Polygon", coordinates: [] },
  }));
  const features = combineEuropeBoundaries([], worldFeatures);
  assert.equal(features.length, 48);
  assert.deepEqual(features.map(({ properties }) => properties.countryCode).sort(), [...EUROPE_ISO3_CODES.values()].sort());
  assert.equal(combineEuropeBoundaries([], [{ id: "USA", geometry: { type: "Polygon" } }]).length, 0);
  const local = { type: "Feature", properties: { countryCode: "FR" }, geometry: { type: "Polygon" } };
  assert.equal(combineEuropeBoundaries([local], []).length, 1);
});

test("recherche les articles grecs en grec et situe Athènes", async () => {
  const originalFetch = globalThis.fetch;
  const urls = [];
  globalThis.fetch = async (input) => {
    urls.push(new URL(String(input)));
    return Response.json({
      articles: [{
        title: "Διαμαρτυρία στην Αθήνα για την ακρίβεια",
        description: "Πολίτες συμμετείχαν σε διαδήλωση.",
        url: "https://media.example/athens-protest",
        publishedAt: "2026-10-01T10:00:00Z",
        source: { name: "Ειδήσεις" },
      }],
    });
  };

  try {
    const result = await fetchArchiveDay("2026-10-01", { gnewsKey: "test-key", countryCodes: ["GR"] });
    assert.equal(urls.length, 1);
    assert.equal(urls[0].searchParams.get("country"), "gr");
    assert.equal(urls[0].searchParams.get("lang"), "el");
    assert.ok(urls[0].searchParams.get("q").includes("διαμαρτυρία"));
    assert.equal(result.provider, "gnews");
    assert.equal(result.articles[0].countryCode, "GR");
    assert.equal(result.articles[0].city, "Αθήνα");
    assert.deepEqual(result.articles[0].position, [37.9838, 23.7275]);
    assert.equal(result.articles[0].type, "rassemblement");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("conserve les mots-clés locaux sans filtre de langue non prise en charge", async () => {
  const originalFetch = globalThis.fetch;
  let url;
  globalThis.fetch = async (input) => {
    url = new URL(String(input));
    return Response.json({ articles: [] });
  };
  try {
    await fetchArchiveDay("2026-10-01", { gnewsKey: "test-key", countryCodes: ["PL"] });
    assert.equal(url.searchParams.get("country"), "pl");
    assert.equal(url.searchParams.get("lang"), null);
    assert.match(url.searchParams.get("q"), /demonstracja/);
    assert.match(url.searchParams.get("q"), /zamieszki/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("configure le collecteur quotidien sans remplacer les limites cartographiques existantes", async () => {
  const config = await readFile(new URL("../wrangler.europe.toml", import.meta.url), "utf8");
  const worker = await readFile(new URL("../workers/europe-collector.js", import.meta.url), "utf8");
  const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
  assert.match(config, /crons = \["0 2,8,14,20 \* \* \*"\]/);
  assert.match(config, /binding = "HISTORY"/);
  assert.match(worker, /coverage:\$\{date\}:\$\{country\.code\}/);
  assert.match(worker, /REQUEST_GAP_MS = 1_100/);
  assert.match(app, /COUNTRY_BOUNDARY_CODES = new Set\(\["BE", "DE", "ES", "FR", "IT"\]\)/);
  assert.match(app, /combineEuropeBoundaries\(localEurope\?\.features, worldFeatures\)/);
  assert.doesNotMatch(app, /Contours européens incomplets|mapDataWarningMode = "europe"/);
  assert.match(app, /mapDataWarning\.hidden = mapDataWarningMode !== "all"/);
  assert.match(app, /countryArticlesByCode\.get\(code\)\?\.articles\.size/);
  assert.match(app, /departmentArticlesByCode\.get\(feature\.properties\.code\)\?\.articles\.size/);
  assert.match(app, /group \? \[\.\.\.group\.articles\.values\(\)\] : \[\],\s*"country",\s*code,/);
  assert.match(app, /nom,\s*group \? \[\.\.\.group\.articles\.values\(\)\] : \[\],\s*"department",/);
  assert.match(app, /ARTICLE\$\{mapped\.length === 1 \? "" : "S"\} ASSOCIÉ/);
  assert.match(app, /Aucun article associé aux pays sélectionnés/);
  assert.match(await readFile(new URL("../styles.css", import.meta.url), "utf8"), /\.map-result-count--europe\s*\{[^}]*color:\s*#e7bd78;/);
});

const SOURCES = [
  { id: "franceinfo", name: "franceinfo", kind: "Audiovisuel public", feed: "https://www.franceinfo.fr/titres.rss", url: "https://www.franceinfo.fr/" },
  { id: "bfmtv", name: "BFMTV", kind: "Chaîne d’information", feed: "https://www.bfmtv.com/rss/news-24-7/", url: "https://www.bfmtv.com/" },
  { id: "cnews", name: "CNEWS", kind: "Chaîne d’information", feed: "https://www.cnews.fr/rss.xml", url: "https://www.cnews.fr/" },
  { id: "le-monde", name: "Le Monde", kind: "Presse nationale", feed: "https://www.lemonde.fr/rss/une.xml", url: "https://www.lemonde.fr/" },
  { id: "france-24", name: "France 24", kind: "Média international", feed: "https://www.france24.com/fr/rss", url: "https://www.france24.com/fr/" },
  { id: "rfi", name: "RFI", kind: "Média international", feed: "https://www.rfi.fr/fr/rss", url: "https://www.rfi.fr/fr/" },
  { id: "le-figaro", name: "Le Figaro", kind: "Presse nationale", feed: "https://www.lefigaro.fr/rss/figaro_actualites.xml", url: "https://www.lefigaro.fr/" },
  { id: "liberation", name: "Libération", kind: "Presse nationale", feed: "https://www.liberation.fr/arc/outboundfeeds/rss-all/?outputType=xml", url: "https://www.liberation.fr/" },
  { id: "ouest-france", name: "Ouest-France", kind: "Presse régionale", feed: "https://www.ouest-france.fr/rss-en-continu.xml", url: "https://www.ouest-france.fr/" },
  { id: "sud-ouest", name: "Sud Ouest", kind: "Presse régionale", feed: "https://www.sudouest.fr/rss.xml", url: "https://www.sudouest.fr/" },
  { id: "20-minutes", name: "20 Minutes", kind: "Presse nationale", feed: "https://www.20minutes.fr/feeds/rss-une.xml", url: "https://www.20minutes.fr/" },
  { id: "la-croix", name: "La Croix", kind: "Presse nationale", feed: "https://www.la-croix.com/feeds/rss/site.xml", url: "https://www.la-croix.com/" },
  { id: "humanite", name: "L’Humanité", kind: "Presse nationale", feed: "https://www.humanite.fr/feed", url: "https://www.humanite.fr/" },
  { id: "la-depeche", name: "La Dépêche du Midi", kind: "Presse régionale", feed: "https://www.ladepeche.fr/rss.xml", url: "https://www.ladepeche.fr/" },
  { id: "le-parisien", name: "Le Parisien", kind: "Presse régionale", feed: "https://feeds.leparisien.fr/leparisien/rss", url: "https://www.leparisien.fr/" },
  { id: "france-inter", name: "France Inter", kind: "Audiovisuel public", feed: "https://www.radiofrance.fr/franceinter/rss", url: "https://www.radiofrance.fr/franceinter/" },
  { id: "lexpress", name: "L’Express", kind: "Presse nationale", feed: "https://www.lexpress.fr/rss/alaune.xml", url: "https://www.lexpress.fr/" },
  { id: "challenges", name: "Challenges", kind: "Presse nationale", feed: "https://www.challenges.fr/rss.xml", url: "https://www.challenges.fr/" },
  { id: "vrt", name: "VRT NWS", kind: "Média public belge", feed: "https://www.vrt.be/vrtnws/nl.rss.articles.xml", url: "https://www.vrt.be/vrtnws/fr/" },
  { id: "rtbf", name: "RTBF Info", kind: "Média public belge", feed: "https://rss.rtbf.be/article/rss/highlight_rtbfinfo_info-belgique.xml?source=internal", url: "https://www.rtbf.be/info/" },
  { id: "elpais", name: "El País", kind: "Presse espagnole", feed: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", url: "https://elpais.com/" },
  { id: "eldiario", name: "elDiario.es", kind: "Presse espagnole", feed: "https://www.eldiario.es/rss/", url: "https://www.eldiario.es/" },
  { id: "rainews", name: "Rai News", kind: "Audiovisuel public italien", feed: "https://www.rainews.it/rss/tutti", url: "https://www.rainews.it/" },
  { id: "repubblica", name: "la Repubblica", kind: "Presse italienne", feed: "https://www.repubblica.it/rss/cronaca/rss2.0.xml", url: "https://www.repubblica.it/" },
  { id: "tagesschau", name: "tagesschau", kind: "Audiovisuel public allemand", feed: "https://www.tagesschau.de/infoservices/alle-meldungen-100~rss2.xml", url: "https://www.tagesschau.de/" },
  { id: "dw-de", name: "Deutsche Welle", kind: "Média international allemand", feed: "https://rss.dw.com/xml/rss-de-all", url: "https://www.dw.com/de/" },
];

// Termes sans ambiguïté : suffisent à retenir un article.
const STRONG_TERMS = [
  "manifestation", "manifestant", "émeute", "émeutier", "violences urbaines",
  "affrontement", "heurts", "vandalisme",
  "demonstration", "demonstrant", "streik", "ausschreitungen", "krawalle", "randale",
  "betoging", "demonstratie", "staking", "rellen",
  "manifestacion", "manifestante", "huelga", "disturbios", "enfrentamientos",
  "manifestazione", "manifestanti", "sciopero", "scioperi", "scontri", "disordini",
];

// Termes ambigus : retenus seulement avec un contexte de mobilisation ou d’ordre public.
const WEAK_TERMS = [
  "rassemblement", "rassemblements", "défilé", "défilés", "mobilisation", "mobilisations",
  "tensions", "dégradation", "dégradations", "incendie", "incendies", "cortège", "cortèges", "blocage", "blocages",
  "protest", "proteste", "protesta", "protestas", "gewalt", "streiks", "stakingen", "betogingen",
];

const CONTEXT_TERMS = [
  "police", "policier", "policiers", "gendarme", "gendarmes", "crs", "forces de l ordre", "prefecture", "prefet",
  "interpelle", "interpelles", "interpellation", "interpellations", "garde a vue", "gaz lacrymogene", "lacrymogenes",
  "syndicat", "syndicats", "syndical", "intersyndicale", "greve", "greves", "greviste", "militants", "collectif",
  "reforme", "retraites", "gouvernement", "contre la", "contre le", "contre les", "appel a", "appellent", "revendications",
  "sit-in", "barricade", "barricades", "voitures brulees", "mobilier urbain", "commissariat", "violences", "emeutes", "casseurs",
  "polizei", "demonstranten", "festnahmen", "politie", "aanhoudingen", "policia", "detenidos", "polizia", "arresti", "fermati",
  "protesters", "protestors", "riot", "clashes",
];

const EXCLUSION_TERMS = [
  "victoria s secret", "victorias secret", "fashion week", "defile de mode", "defiles de mode", "haute couture", "mannequin",
  "tapis rouge", "red carpet", "gueule de bois", "festival de cannes", "carnaval", "concert", "cinema", "box-office",
  "fashion show", "modeschau", "sfilata di moda", "desfile de moda", "rassemblement national", "ras-le-bol fiscal",
];

function assessRelevance(normalizedText) {
  const text = normalizedText.replace(/[’']/g, " ").replace(/rassemblement national/g, " ");
  const strong = STRONG_TERMS.filter((term) => text.includes(normalize(term)));
  const weak = WEAK_TERMS.filter((term) => containsWord(text, normalize(term)));
  const context = CONTEXT_TERMS.filter((term) => containsWord(text, normalize(term)));
  const excluded = EXCLUSION_TERMS.some((term) => containsWord(text, normalize(term)));
  const score = strong.length * 3 + weak.length + Math.min(context.length, 3) * 2 - (excluded ? 4 : 0);
  const relevant = strong.length > 0
    ? !excluded || context.length > 0
    : weak.length > 0 && context.length > 0 && !excluded;
  const candidate = !relevant && strong.length + weak.length > 0;
  return { relevant, candidate, score, matchedTerms: [...strong, ...weak] };
}

const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const AI_MAX_CANDIDATES = 20;

// Demande à Workers AI quels articles ambigus traitent réellement d’un rassemblement, d’une manifestation ou de troubles à l’ordre public.
async function classifyWithAI(ai, candidates) {
  const batch = candidates.slice(0, AI_MAX_CANDIDATES);
  const list = batch
    .map((article, index) => `${index}. ${article.title} — ${article.description.slice(0, 160)}`)
    .join("\n");
  const run = ai.run(AI_MODEL, {
    max_tokens: 120,
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "Tu classes des titres de presse. Réponds uniquement par un tableau JSON des numéros dont l’article rapporte un événement réel de manifestation, rassemblement revendicatif, grève, émeute, affrontement ou trouble à l’ordre public. Exclus mode, culture, sport, politique partisane sans mobilisation de rue, métaphores et expressions. Exemple : [0,3]. Si aucun : [].",
      },
      { role: "user", content: list },
    ],
  });
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("AI timeout")), 7000));
  const result = await Promise.race([run, timeout]);
  const match = String(result?.response ?? "").match(/\[[\d,\s]*\]/);
  if (!match) throw new Error("AI response unreadable");
  const accepted = new Set(JSON.parse(match[0]).filter(Number.isInteger));
  return new Set(batch.filter((_, index) => accepted.has(index)));
}

async function resolveCandidates(articles, ai) {
  const candidates = articles
    .filter((article) => article.candidate)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  let accepted = new Set();
  if (ai && candidates.length > 0) {
    try {
      accepted = await classifyWithAI(ai, candidates);
    } catch (error) {
      console.warn(JSON.stringify({ event: "ai_classification_unavailable", message: error.message }));
    }
  }
  return articles
    .filter((article) => !article.candidate || accepted.has(article))
    .map(({ candidate, ...article }) => (candidate ? { ...article, relevance: 4, classifiedBy: "ai" } : article));
}

const CITIES = [
  { name: "Paris", region: "Île-de-France", position: [48.8566, 2.3522] },
  { name: "Lyon", region: "Auvergne-Rhône-Alpes", position: [45.764, 4.8357] },
  { name: "Marseille", region: "Provence-Alpes-Côte d’Azur", position: [43.2965, 5.3698] },
  { name: "Bordeaux", region: "Nouvelle-Aquitaine", position: [44.8378, -0.5792] },
  { name: "Lille", region: "Hauts-de-France", position: [50.6292, 3.0573] },
  { name: "Nantes", region: "Pays de la Loire", position: [47.2184, -1.5536] },
  { name: "Rennes", region: "Bretagne", position: [48.1173, -1.6778] },
  { name: "Toulouse", region: "Occitanie", position: [43.6047, 1.4442] },
  { name: "Strasbourg", region: "Grand Est", position: [48.5734, 7.7521] },
  { name: "Nice", region: "Provence-Alpes-Côte d’Azur", position: [43.7102, 7.262] },
  { name: "Montpellier", region: "Occitanie", position: [43.6119, 3.8772] },
  { name: "Grenoble", region: "Auvergne-Rhône-Alpes", position: [45.1885, 5.7245] },
  { name: "Rouen", region: "Normandie", position: [49.4432, 1.0999] },
  { name: "Dijon", region: "Bourgogne-Franche-Comté", position: [47.322, 5.0415] },
  { name: "Reims", region: "Grand Est", position: [49.2583, 4.0317] },
  { name: "Saint-Denis", region: "Île-de-France", position: [48.9362, 2.3574], countryCode: "FR" },
  { name: "Bruxelles", countryCode: "BE", position: [50.8503, 4.3517], aliases: ["Brussels", "Brussel"] },
  { name: "Anvers", countryCode: "BE", position: [51.2194, 4.4025], aliases: ["Antwerpen", "Antwerp"] },
  { name: "Gand", countryCode: "BE", position: [51.0543, 3.7174], aliases: ["Gent"] },
  { name: "Liège", countryCode: "BE", position: [50.6326, 5.5797], aliases: ["Liege"] },
  { name: "Charleroi", countryCode: "BE", position: [50.4108, 4.4446] },
  { name: "Namur", countryCode: "BE", position: [50.4674, 4.872] },
  { name: "Madrid", countryCode: "ES", position: [40.4168, -3.7038] },
  { name: "Barcelona", countryCode: "ES", position: [41.3874, 2.1686] },
  { name: "Valence", countryCode: "ES", position: [39.4699, -0.3763], aliases: ["Valencia"] },
  { name: "Séville", countryCode: "ES", position: [37.3891, -5.9845], aliases: ["Sevilla"] },
  { name: "Bilbao", countryCode: "ES", position: [43.263, -2.935] },
  { name: "Saragosse", countryCode: "ES", position: [41.6488, -0.8891], aliases: ["Zaragoza"] },
  { name: "Rome", countryCode: "IT", position: [41.9028, 12.4964], aliases: ["Roma"] },
  { name: "Milan", countryCode: "IT", position: [45.4642, 9.19], aliases: ["Milano"] },
  { name: "Naples", countryCode: "IT", position: [40.8518, 14.2681], aliases: ["Napoli"] },
  { name: "Turin", countryCode: "IT", position: [45.0703, 7.6869], aliases: ["Torino"] },
  { name: "Bologne", countryCode: "IT", position: [44.4949, 11.3426], aliases: ["Bologna"] },
  { name: "Florence", countryCode: "IT", position: [43.7696, 11.2558], aliases: ["Firenze"] },
  { name: "Berlin", countryCode: "DE", position: [52.52, 13.405] },
  { name: "Hambourg", countryCode: "DE", position: [53.5511, 9.9937], aliases: ["Hamburg"] },
  { name: "Munich", countryCode: "DE", position: [48.1351, 11.582], aliases: ["München", "Munchen"] },
  { name: "Cologne", countryCode: "DE", position: [50.9375, 6.9603], aliases: ["Köln", "Koln"] },
  { name: "Francfort", countryCode: "DE", position: [50.1109, 8.6821], aliases: ["Frankfurt"] },
  { name: "Stuttgart", countryCode: "DE", position: [48.7758, 9.1829] },
  { name: "Leipzig", countryCode: "DE", position: [51.3397, 12.3731] },
];

const MATCHERS = [
  { type: "degradations", terms: ["dégradation", "dégradations", "vandalisme", "incendie", "émeute", "émeutes", "violences urbaines", "ausschreitungen", "krawalle", "randale", "disturbios", "disordini", "rellen"] },
  { type: "tensions", terms: ["affrontement", "affrontements", "heurts", "tension", "tensions", "violence", "violences", "gewalt", "enfrentamientos", "scontri"] },
  { type: "rassemblement", terms: ["manifestation", "manifestations", "manifestant", "manifestants", "rassemblement", "rassemblements", "défilé", "mobilisation", "cortège", "demonstration", "demonstrationen", "demonstrant", "demonstranten", "protest", "proteste", "streik", "betoging", "demonstratie", "staking", "manifestacion", "manifestaciones", "manifestante", "protesta", "protestas", "huelga", "manifestazione", "manifestazioni", "manifestanti", "sciopero", "scioperi"] },
];

const MAX_FEED_BYTES = 1_000_000;
const MAX_ARTICLES_PER_SOURCE = 50;

export async function onRequestGet({ env } = {}) {
  return fetchArticles(SOURCES, { ai: env?.AI });
}

export async function onRequestPost({ request, env }) {
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 16_384) {
    return Response.json({ error: "La configuration des flux est trop volumineuse." }, { status: 413 });
  }
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return Response.json({ error: "Un corps JSON est requis." }, { status: 415 });
  }

  let body;
  try {
    body = await readLimitedJson(request, 16_384);
  } catch (error) {
    if (error instanceof RangeError) {
      return Response.json({ error: "La configuration des flux est trop volumineuse." }, { status: 413 });
    }
    return Response.json({ error: "Configuration JSON invalide." }, { status: 400 });
  }

  if (!Array.isArray(body?.customFeeds) || body.customFeeds.length > 5) {
    return Response.json({ error: "Ajoute au maximum cinq flux RSS/Atom personnels." }, { status: 400 });
  }

  const customFeeds = [];
  const ids = new Set();
  for (const feed of body.customFeeds) {
    const source = validateCustomFeed(feed);
    if (!source || ids.has(source.id)) {
      return Response.json({ error: "Un flux personnel est invalide ou dupliqué." }, { status: 400 });
    }
    ids.add(source.id);
    customFeeds.push(source);
  }
  return fetchArticles([...SOURCES, ...customFeeds], { privateResponse: true, ai: env?.AI });
}

async function readLimitedJson(request, maxBytes) {
  if (!request.body) throw new SyntaxError("Missing request body");
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      throw new RangeError("Request body exceeds size limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function validateCustomFeed(feed) {
  if (!feed || typeof feed !== "object"
    || typeof feed.id !== "string"
    || !/^[a-z0-9-]{1,40}$/.test(feed.id)
    || typeof feed.name !== "string"
    || !feed.name.trim()
    || feed.name.trim().length > 60
    || typeof feed.feed !== "string"
    || feed.feed.length > 2048
    || typeof feed.countryCode !== "string"
    || (feed.countryCode && !["FR", "BE", "ES", "IT", "DE"].includes(feed.countryCode))) return null;
  try {
    const url = new URL(feed.feed);
    if (url.protocol !== "https:" || url.username || url.password || url.port
      || url.hostname.replace(/\.$/, "") === "localhost"
      || url.hostname.endsWith(".localhost")
      || !url.hostname.includes(".")
      || /\.(?:local|internal|test|invalid)$/i.test(url.hostname)
      || /^\d+(?:\.\d+){3}$/.test(url.hostname)
      || url.hostname.includes(":")) return null;
    return {
      id: `custom-${feed.id}`,
      name: feed.name.trim(),
      kind: "Flux personnel",
      feed: url.href,
      url: `${url.origin}/`,
      countryCode: feed.countryCode || null,
      custom: true,
    };
  } catch {
    return null;
  }
}

/*
 * Custom feeds are bounded to a small set of HTTPS URLs and are not followed
 * across redirects, avoiding private-network access through redirect targets.
 */

async function fetchArticles(configuredSources, { privateResponse = false, ai } = {}) {
  const sourceResults = await Promise.all(configuredSources.map(async (source) => {
    try {
      const response = await fetch(source.feed, {
        headers: { Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5" },
        signal: AbortSignal.timeout(8000),
        redirect: source.custom ? "manual" : "follow",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xml = await readLimitedText(response, MAX_FEED_BYTES);
      const articles = parseFeed(xml, source);
      return { source: publicSource(source, "ok", articles.length), articles };
    } catch (error) {
      console.warn(JSON.stringify({
        event: "rss_source_unavailable",
        source: source.id,
        message: source.custom ? error.name : String(error),
      }));
      return {
        source: publicSource(source, "indisponible", 0),
        articles: [],
      };
    }
  }));

  const sources = sourceResults.map((result) => result.source);
  const articles = (await resolveCandidates(sourceResults.flatMap((result) => result.articles), ai))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, sources.length * MAX_ARTICLES_PER_SOURCE);
  for (const source of sources) {
    source.articleCount = articles.filter((article) => article.sourceId === source.id).length;
  }
  const availableSources = sources.filter((source) => source.status === "ok").length;
  const status = availableSources === 0 ? 503 : 200;

  return Response.json({
    fetchedAt: new Date().toISOString(),
    articles,
    sources,
    warning: availableSources < sources.length
      ? `${sources.length - availableSources} source(s) temporairement indisponible(s).`
      : null,
  }, {
    status,
    headers: {
      "Cache-Control": privateResponse
        ? "no-store"
        : "public, max-age=0, s-maxage=180, stale-while-revalidate=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

const ARCHIVE_QUERIES = [
  { hl: "fr", gl: "FR", ceid: "FR:fr", countryCode: "FR", terms: "manifestation OR manifestants OR émeutes OR affrontements OR rassemblement OR \"violences urbaines\"" },
  { hl: "fr", gl: "BE", ceid: "BE:fr", countryCode: "BE", terms: "manifestation OR manifestants OR émeutes OR affrontements" },
  { hl: "es", gl: "ES", ceid: "ES:es", countryCode: "ES", terms: "manifestación OR manifestantes OR disturbios OR huelga OR protesta" },
  { hl: "it", gl: "IT", ceid: "IT:it", countryCode: "IT", terms: "manifestazione OR manifestanti OR scontri OR sciopero OR disordini" },
  { hl: "de", gl: "DE", ceid: "DE:de", countryCode: "DE", terms: "Demonstration OR Demonstranten OR Ausschreitungen OR Krawalle OR Streik" },
];

function shiftDate(date, days) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

// Les flux RSS des médias ne conservent que quelques jours ; les jours plus anciens passent par la recherche datée de Google Actualités.
export async function fetchArchiveDay(date, { ai } = {}) {
  const results = await Promise.all(ARCHIVE_QUERIES.map(async (query) => {
    const q = `${query.terms} after:${shiftDate(date, -1)} before:${shiftDate(date, 2)}`;
    const feed = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${query.hl}&gl=${query.gl}&ceid=${encodeURIComponent(query.ceid)}`;
    try {
      const response = await fetch(feed, {
        headers: { Accept: "application/rss+xml, application/xml, text/xml;q=0.9" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return { ok: true, articles: parseArchiveFeed(await readLimitedText(response, MAX_FEED_BYTES), query, feed) };
    } catch (error) {
      console.warn(JSON.stringify({ event: "archive_source_unavailable", country: query.countryCode, message: String(error) }));
      return { ok: false, articles: [] };
    }
  }));

  const articles = (await resolveCandidates(results.flatMap((result) => result.articles), ai))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  return { date, articles, available: results.filter((result) => result.ok).length, total: results.length };
}

function parseArchiveFeed(xml, query, feed) {
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item\s*>/gi) || [];
  const now = Date.now();
  const seen = new Set();
  const articles = [];
  for (const item of items) {
    const rawTitle = cleanText(readTag(item, "title"));
    const sourceName = cleanText(readTag(item, "source")) || "Google Actualités";
    const suffix = ` - ${sourceName}`;
    const title = rawTitle.endsWith(suffix) ? rawTitle.slice(0, -suffix.length).trim() : rawTitle;
    const link = safeArticleUrl(cleanText(readTag(item, "link")), feed);
    const timestamp = Date.parse(cleanText(readTag(item, "pubDate")));
    if (!title || !link || !Number.isFinite(timestamp) || timestamp > now + 60 * 60 * 1000 || seen.has(link)) continue;

    const normalized = normalize(title);
    const { relevant, candidate, matchedTerms, score } = assessRelevance(normalized);
    if (!(relevant || candidate)) continue;
    seen.add(link);

    const matchedCity = findMatchedCity(title, "");
    const slug = normalize(sourceName).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "archive";
    articles.push({
      id: `archive-${slug}:${link}`,
      title,
      description: "",
      link,
      publishedAt: new Date(timestamp).toISOString(),
      datePrecision: "minute",
      sourceId: slug,
      sourceName,
      type: classify(normalized),
      matchedTerms: [...new Set(matchedTerms)],
      relevance: score,
      candidate,
      image: null,
      archive: true,
      city: matchedCity?.name || null,
      region: matchedCity?.region || null,
      position: matchedCity?.position || null,
      countryCode: matchedCity?.countryCode || (matchedCity ? "FR" : findCountryCode(title)) || query.countryCode,
    });
  }
  return articles;
}

function publicSource(source, status, articleCount) {
  return {
    id: source.id,
    name: source.name,
    kind: source.kind,
    url: source.url,
    status,
    articleCount,
    custom: Boolean(source.custom),
  };
}

async function readLimitedText(response, maxBytes) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error("RSS feed exceeds size limit");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function parseFeed(xml, source) {
  const items = xml.match(/<(?:item|entry)(?:\s[^>]*)?>[\s\S]*?<\/(?:item|entry)\s*>/gi) || [];
  const now = Date.now();
  const articles = [];
  const seen = new Set();

  for (const item of items) {
    const title = cleanText(readTag(item, "title"));
    const descriptionMarkup = readTag(item, "description")
      || readTag(item, "content:encoded")
      || readTag(item, "summary")
      || readTag(item, "content");
    const description = cleanText(descriptionMarkup).slice(0, 320);
    const dateValue = cleanText(readTag(item, "pubDate") || readTag(item, "published") || readTag(item, "updated") || readTag(item, "date"));
    const link = safeArticleUrl(readItemLink(item) || cleanText(readTag(item, "link")), source.feed);
    const parsedDate = Date.parse(dateValue);
    const timestamp = Number.isFinite(parsedDate) ? parsedDate : source.id === "le-parisien" ? dateFromLeParisienUrl(link) : Number.NaN;
    const datePrecision = Number.isFinite(parsedDate) ? "minute" : Number.isFinite(timestamp) ? "day" : null;
    const isEstimatedToday = datePrecision === "day"
      && new Date(timestamp).toISOString().slice(0, 10) === new Date(now).toISOString().slice(0, 10);
    if (!title || !link || !Number.isFinite(timestamp)
      || (timestamp > now + 60 * 60 * 1000 && !isEstimatedToday)) continue;

    const normalized = normalize(`${title} ${description}`);
    const { relevant, candidate, matchedTerms, score } = assessRelevance(normalized);
    if (!(relevant || candidate) || seen.has(link)) continue;
    seen.add(link);

    const matchedCity = findMatchedCity(title, description);
    articles.push({
      id: `${source.id}:${link}`,
      title,
      description,
      link,
      publishedAt: new Date(timestamp).toISOString(),
      datePrecision,
      sourceId: source.id,
      sourceName: source.name,
      type: classify(normalized),
      matchedTerms: [...new Set(matchedTerms)],
      relevance: score,
      candidate,
      image: extractImage(item, source.feed),
      city: matchedCity?.name || null,
      region: matchedCity?.region || null,
      position: matchedCity?.position || null,
      countryCode: matchedCity?.countryCode || (matchedCity ? "FR" : findCountryCode(`${title} ${description}`)) || source.countryCode || null,
    });
    if (articles.length >= MAX_ARTICLES_PER_SOURCE) break;
  }
  return articles;
}

function readItemLink(item) {
  const links = [...item.matchAll(/<link\b([^>]*)\/?\s*>/gi)];
  for (const match of links) {
    const attributes = Object.fromEntries(
      [...match[1].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
        .map((attribute) => [attribute[1].toLowerCase(), decodeEntities(attribute[2] ?? attribute[3] ?? "")]),
    );
    if (attributes.href && (!attributes.rel || attributes.rel === "alternate")) return attributes.href;
  }
  return "";
}

function findMatchedCity(title, description) {
  const entries = CITIES.flatMap((city) => [city.name, ...(city.aliases || [])]
    .map((name) => ({ city, name, normalizedName: normalize(name) })))
    .sort((a, b) => b.normalizedName.length - a.normalizedName.length);
  for (const [text, isTitle] of [[title, true], [description, false]]) {
    const normalized = normalize(text);
    for (const entry of entries) {
      if (!containsWord(normalized, entry.normalizedName)) continue;
      const index = normalized.indexOf(entry.normalizedName);
      const prefix = normalized.slice(0, index).trim().split(/\s+/);
      const lastWord = prefix.at(-1);
      if (["a", "au", "aux", "en", "in", "near", "bei", "naar"].includes(lastWord)
        || ["in der", "in den", "in het"].some((cue) => normalized.slice(0, index).trim().endsWith(cue))) {
        return entry.city;
      }
      const escapedName = entry.name.split(/\s+/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("\\s+");
      if (isTitle && index === 0 && new RegExp(`^\\s*${escapedName}\\s*(?:[:,—–-])`, "u").test(text)) {
        return entry.city;
      }
    }
  }
  return null;
}

function findCountryCode(text) {
  const normalized = normalize(text);
  const countries = [
    ["BE", ["belgique", "belgium", "belgie", "belgië"]],
    ["ES", ["espagne", "espana", "spain", "españa"]],
    ["IT", ["italie", "italia", "italy"]],
    ["DE", ["allemagne", "deutschland", "germany"]],
    ["FR", ["france"]],
  ];
  return countries.find(([, names]) => names.some((name) => containsWord(normalized, normalize(name))))?.[0] || null;
}

function dateFromLeParisienUrl(link) {
  if (!link) return Number.NaN;
  const match = new URL(link).pathname.match(/-(\d{2})-(\d{2})-(\d{4})-[A-Z0-9]+\.php$/i);
  if (!match) return Number.NaN;
  const [, day, month, year] = match;
  const timestamp = Date.UTC(Number(year), Number(month) - 1, Number(day), 12);
  const date = new Date(timestamp);
  return date.getUTCDate() === Number(day)
    && date.getUTCMonth() === Number(month) - 1
    && date.getUTCFullYear() === Number(year)
    ? timestamp
    : Number.NaN;
}

function extractImage(item, baseUrl) {
  const mediaTags = item.match(/<(?:media:content|media:thumbnail|enclosure)\b[^>]*>/gi) || [];
  for (const tag of mediaTags) {
    const attributes = Object.fromEntries(
      [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
        .map((match) => [match[1].toLowerCase(), match[2] ?? match[3] ?? ""]),
    );
    const type = (attributes.type || "").toLowerCase();
    const medium = (attributes.medium || "").toLowerCase();
    const isThumbnail = /^<media:thumbnail\b/i.test(tag);
    if (!attributes.url || (!isThumbnail && !type.startsWith("image/") && medium !== "image")) continue;
    const image = safeImageUrl(decodeEntities(attributes.url), baseUrl);
    if (image) return image;
  }

  const html = decodeEntities(item.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1"));
  const imageTag = html.match(/<img\b[^>]*>/i)?.[0];
  const imageSource = imageTag?.match(/\b(?:src|data-src)\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  return imageSource ? safeImageUrl(imageSource[1] ?? imageSource[2], baseUrl) : null;
}

function safeImageUrl(value, baseUrl) {
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function readTag(xml, tag) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = xml.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}\\s*>`, "i"));
  return match?.[1] || "";
}

function cleanText(value) {
  return decodeEntities(value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, code) => {
    if (code[0] === "#") {
      const number = code[1].toLowerCase() === "x" ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
      return Number.isFinite(number) && number <= 0x10ffff ? String.fromCodePoint(number) : "";
    }
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " }[code.toLowerCase()] || entity;
  });
}

function safeArticleUrl(value, baseUrl) {
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function normalize(value) {
  return value.toLocaleLowerCase("fr").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function containsWord(text, word) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`, "i").test(text);
}

function classify(text) {
  for (const matcher of MATCHERS) {
    if (matcher.terms.some((term) => text.includes(normalize(term)))) return matcher.type;
  }
  return "autre";
}

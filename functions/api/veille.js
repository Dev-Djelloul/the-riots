const SOURCES = [
  { id: "franceinfo", name: "franceinfo", kind: "Audiovisuel public", feed: "https://www.franceinfo.fr/titres.rss", url: "https://www.franceinfo.fr/" },
  { id: "bfmtv", name: "BFMTV", kind: "Chaîne d’information", feed: "https://www.bfmtv.com/rss/news-24-7/", url: "https://www.bfmtv.com/" },
  { id: "cnews", name: "CNEWS", kind: "Chaîne d’information", feed: "https://www.cnews.fr/rss.xml", url: "https://www.cnews.fr/" },
  { id: "le-monde", name: "Le Monde", kind: "Presse nationale", feed: "https://www.lemonde.fr/rss/une.xml", url: "https://www.lemonde.fr/" },
  { id: "france-24", name: "France 24", kind: "Média international", feed: "https://www.france24.com/fr/rss", url: "https://www.france24.com/fr/" },
  { id: "liberation", name: "Libération", kind: "Presse nationale", feed: "https://www.liberation.fr/arc/outboundfeeds/rss-all/?outputType=xml", url: "https://www.liberation.fr/" },
  { id: "ouest-france", name: "Ouest-France", kind: "Presse régionale", feed: "https://www.ouest-france.fr/rss-en-continu.xml", url: "https://www.ouest-france.fr/" },
  { id: "20-minutes", name: "20 Minutes", kind: "Presse nationale", feed: "https://www.20minutes.fr/feeds/rss-une.xml", url: "https://www.20minutes.fr/" },
  { id: "la-croix", name: "La Croix", kind: "Presse nationale", feed: "https://www.la-croix.com/feeds/rss/site.xml", url: "https://www.la-croix.com/" },
  { id: "humanite", name: "L’Humanité", kind: "Presse nationale", feed: "https://www.humanite.fr/feed", url: "https://www.humanite.fr/" },
  { id: "la-depeche", name: "La Dépêche du Midi", kind: "Presse régionale", feed: "https://www.ladepeche.fr/rss.xml", url: "https://www.ladepeche.fr/" },
  { id: "le-parisien", name: "Le Parisien", kind: "Presse régionale", feed: "https://feeds.leparisien.fr/leparisien/rss", url: "https://www.leparisien.fr/" },
];

const TERMS = [
  "manifestation", "manifestations", "manifestant", "manifestants", "rassemblement",
  "rassemblements", "défilé", "mobilisation", "émeute", "émeutes", "émeutier",
  "violences urbaines", "affrontement", "affrontements", "heurts", "tensions",
  "dégradation", "dégradations", "vandalisme", "incendie", "cortège", "blocage",
];

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
  { name: "Saint-Denis", region: "Île-de-France", position: [48.9362, 2.3574] },
];

const MATCHERS = [
  { type: "degradations", terms: ["dégradation", "dégradations", "vandalisme", "incendie", "émeute", "émeutes", "violences urbaines"] },
  { type: "tensions", terms: ["affrontement", "affrontements", "heurts", "tension", "tensions", "violence", "violences"] },
  { type: "rassemblement", terms: ["manifestation", "manifestations", "manifestant", "manifestants", "rassemblement", "rassemblements", "défilé", "mobilisation", "cortège"] },
];

const MAX_FEED_BYTES = 1_000_000;
const MAX_ARTICLES_PER_SOURCE = 50;

export async function onRequestGet() {
  const sourceResults = await Promise.all(SOURCES.map(async (source) => {
    try {
      const response = await fetch(source.feed, {
        headers: { Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xml = await readLimitedText(response, MAX_FEED_BYTES);
      const articles = parseFeed(xml, source);
      return { source: publicSource(source, "ok", articles.length), articles };
    } catch (error) {
      console.warn(JSON.stringify({ event: "rss_source_unavailable", source: source.id, message: String(error) }));
      return {
        source: publicSource(source, "indisponible", 0),
        articles: [],
      };
    }
  }));

  const sources = sourceResults.map((result) => result.source);
  const articles = sourceResults.flatMap((result) => result.articles)
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, SOURCES.length * MAX_ARTICLES_PER_SOURCE);
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
      "Cache-Control": "public, max-age=0, s-maxage=180, stale-while-revalidate=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function publicSource(source, status, articleCount) {
  return { id: source.id, name: source.name, kind: source.kind, url: source.url, status, articleCount };
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
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];
  const now = Date.now();
  const articles = [];
  const seen = new Set();

  for (const item of items) {
    const title = cleanText(readTag(item, "title"));
    const descriptionMarkup = readTag(item, "description") || readTag(item, "content:encoded");
    const description = cleanText(descriptionMarkup).slice(0, 320);
    const dateValue = cleanText(readTag(item, "pubDate") || readTag(item, "date"));
    const link = safeArticleUrl(cleanText(readTag(item, "link")), source.feed);
    const parsedDate = Date.parse(dateValue);
    const timestamp = Number.isFinite(parsedDate) ? parsedDate : source.id === "le-parisien" ? dateFromLeParisienUrl(link) : Number.NaN;
    const datePrecision = Number.isFinite(parsedDate) ? "minute" : Number.isFinite(timestamp) ? "day" : null;
    if (!title || !link || !Number.isFinite(timestamp) || timestamp > now + 60 * 60 * 1000) continue;

    const normalized = normalize(`${title} ${description}`);
    const matchedTerms = TERMS.filter((term) => normalized.includes(normalize(term)));
    if (matchedTerms.length === 0 || seen.has(link)) continue;
    seen.add(link);

    const matchedCity = CITIES.find((city) => containsWord(normalize(title), normalize(city.name)));
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
      image: extractImage(item, source.feed),
      city: matchedCity?.name || null,
      region: matchedCity?.region || null,
      position: matchedCity?.position || null,
    });
    if (articles.length >= MAX_ARTICLES_PER_SOURCE) break;
  }
  return articles;
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

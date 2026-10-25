import { fetchArchiveDay, readHistoryDay, shiftDate } from "./veille.js";
import { EUROPE_COUNTRIES } from "../../europe-countries.js";

function clearUnprovenSearchLocation(article) {
  if (!article || !article.countryCode) return article;
  const hasExplicitPlace = article.city || article.placeMention || article.position;
  const inferredFromSearch = article.countryCodeBasis === "search-country"
    || (!article.countryCodeBasis && !hasExplicitPlace);
  if (!inferredFromSearch) return article;
  return {
    ...article,
    searchCountryCode: article.searchCountryCode || article.countryCode || null,
    countryCode: null,
    countryCodeBasis: "unlocated",
  };
}

function normalizeCachedArticles(value) {
  return Array.isArray(value) ? value.map(clearUnprovenSearchLocation) : null;
}

export async function onRequestGet({ request, env }) {
  const params = new URL(request.url).searchParams;
  const date = params.get("date") || "";
  const countryCode = params.get("country") || "";
  const parsed = new Date(`${date}T00:00:00Z`);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === date;
  if (!valid) {
    return Response.json({ error: "Date invalide (format AAAA-MM-JJ attendu)." }, { status: 400 });
  }
  if (countryCode && !EUROPE_COUNTRIES.some((country) => country.code === countryCode)) {
    return Response.json({ error: "Pays invalide." }, { status: 400 });
  }
  if (parsed.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    return Response.json({ date, articles: [], available: 0, total: 0 });
  }

  // L’historique mémorisé par la veille est prioritaire ; la recherche externe ne sert que de repli.
  // Un jour déjà récupéré chez GNews est relu depuis KV : il ne consomme plus de quota.
  const archiveKey = `archive:${date}`;
  const archivedDay = env?.HISTORY ? await env.HISTORY.get(archiveKey, "json").catch(() => null) : null;
  const normalizedArchivedDay = Array.isArray(archivedDay)
    ? archivedDay.map(clearUnprovenSearchLocation)
    : archivedDay;
  let articles = Array.isArray(normalizedArchivedDay)
    ? countryCode ? normalizedArchivedDay.filter((article) => article.countryCode === countryCode) : normalizedArchivedDay
    : [];
  let collectedCountries = 0;
  let hasRequestedCountry = false;
  let scheduledCountries = 0;
  if (env?.HISTORY) {
    const codes = countryCode ? [countryCode] : EUROPE_COUNTRIES.map(({ code }) => code);
    const collectedDays = await Promise.all(codes.map(async (code) => [
      code,
      normalizeCachedArticles(await env.HISTORY.get(`coverage:${date}:${code}`, "json").catch(() => null)),
    ]));
    scheduledCountries = collectedDays.filter(([, countryDay]) => Array.isArray(countryDay)).length;
    let manualDay = null;
    if (countryCode && !scheduledCountries) {
      manualDay = normalizeCachedArticles(
        await env.HISTORY.get(`archive-country:${date}:${countryCode}`, "json").catch(() => null),
      );
    }
    collectedCountries = scheduledCountries || Number(Array.isArray(manualDay));
    hasRequestedCountry = Boolean(scheduledCountries || Array.isArray(manualDay));
    const countryArticles = countryCode
      ? scheduledCountries ? collectedDays[0][1] : manualDay
      : collectedDays.flatMap(([, countryDay]) => Array.isArray(countryDay) ? countryDay : []);
    const scopedCountryArticles = countryCode && Array.isArray(countryArticles)
      ? countryArticles.filter((article) => article.countryCode === countryCode)
      : countryArticles;
    articles = [...new Map([...articles, ...(Array.isArray(scopedCountryArticles) ? scopedCountryArticles : [])]
      .map((article) => [article.link || article.id, article])).values()];
  }
  if (!articles.length && env?.HISTORY && countryCode) {
    const historyDays = await Promise.all([-1, 0, 1]
      .map((offset) => readHistoryDay(env.HISTORY, shiftDate(date, offset))));
    const days = historyDays.map((day) => day.map(clearUnprovenSearchLocation));
    if (!collectedCountries) articles = days.flat().filter((article) => article.countryCode === countryCode);
  }
  let result = {
    date,
    articles,
    available: countryCode
      ? Number(hasRequestedCountry || articles.length > 0)
      : collectedCountries || (articles.length || Array.isArray(archivedDay) ? 1 : 0),
    total: countryCode ? 1 : collectedCountries ? EUROPE_COUNTRIES.length : 1,
    source: scheduledCountries ? "scheduled-collection" : "history",
  };
  const canQueryArchive = !Array.isArray(archivedDay) || Boolean(countryCode);
  const needsBackfill = countryCode
    ? !hasRequestedCountry
    : !Array.isArray(archivedDay) && scheduledCountries < EUROPE_COUNTRIES.length;
  if (canQueryArchive && needsBackfill) {
    const previouslyCollectedArticles = articles;
    result = {
      ...(await fetchArchiveDay(date, {
        ai: env?.AI,
        gnewsKey: env?.GNEWS_API_KEY,
        countryCodes: countryCode ? [countryCode] : undefined,
        gdeltOnly: !countryCode,
      })),
      source: "external",
    };
    if (result.available > 0 && previouslyCollectedArticles.length) {
      result.articles = [...new Map([...previouslyCollectedArticles, ...result.articles]
        .map((article) => [article.link || article.id, article])).values()];
    } else if (result.available === 0 && previouslyCollectedArticles.length) {
      result = {
        ...result,
        date,
        articles: previouslyCollectedArticles,
        available: collectedCountries,
        total: countryCode ? 1 : EUROPE_COUNTRIES.length,
        source: "history",
      };
    }
    const settled = Date.now() - parsed.getTime() > 3 * 24 * 60 * 60 * 1000;
    if (env?.HISTORY && result.available > 0 && !result.errors?.length
      && (["gdelt", "google-news-rss"].includes(result.provider) || (result.provider === "gnews" && settled))) {
      const key = countryCode ? `archive-country:${date}:${countryCode}` : archiveKey;
      const expirationTtl = settled ? 400 * 24 * 60 * 60 : 15 * 60;
      await env.HISTORY.put(key, JSON.stringify(result.articles), { expirationTtl }).catch(() => {});
    }
  }

  const recent = Date.now() - parsed.getTime() < 3 * 24 * 60 * 60 * 1000;
  const cacheable = result.articles.length > 0;
  return Response.json({ ...result, fetchedAt: new Date().toISOString() }, {
    status: result.source === "external" && result.available === 0 ? 503 : 200,
    headers: {
      "Cache-Control": !cacheable
        ? "no-store"
        : recent ? "public, max-age=0, s-maxage=300" : "public, max-age=600, s-maxage=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

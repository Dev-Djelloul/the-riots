import { fetchArchiveDay, readHistoryDay, shiftDate } from "./veille.js";

export async function onRequestGet({ request, env }) {
  const date = new URL(request.url).searchParams.get("date") || "";
  const parsed = new Date(`${date}T00:00:00Z`);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === date;
  if (!valid) {
    return Response.json({ error: "Date invalide (format AAAA-MM-JJ attendu)." }, { status: 400 });
  }
  if (parsed.getTime() > Date.now() + 24 * 60 * 60 * 1000) {
    return Response.json({ date, articles: [], available: 0, total: 0 });
  }

  // L’historique mémorisé par la veille est prioritaire ; la recherche externe ne sert que de repli.
  // Un jour déjà récupéré chez GNews est relu depuis KV : il ne consomme plus de quota.
  const archiveKey = `archive:${date}`;
  const archivedDay = env?.HISTORY ? await env.HISTORY.get(archiveKey, "json").catch(() => null) : null;
  let articles = Array.isArray(archivedDay) ? archivedDay : [];
  if (!articles.length && env?.HISTORY) {
    const days = await Promise.all([-1, 0, 1].map((offset) => readHistoryDay(env.HISTORY, shiftDate(date, offset))));
    articles = days.flat();
  }
  let result = { date, articles, available: articles.length || Array.isArray(archivedDay) ? 1 : 0, total: 1, source: "history" };
  if (!articles.length && !Array.isArray(archivedDay)) {
    result = { ...(await fetchArchiveDay(date, { ai: env?.AI, gnewsKey: env?.GNEWS_API_KEY })), source: "external" };
    const settled = Date.now() - parsed.getTime() > 3 * 24 * 60 * 60 * 1000;
    if (env?.HISTORY && result.provider === "gnews" && settled && !result.errors?.length) {
      await env.HISTORY.put(archiveKey, JSON.stringify(result.articles), { expirationTtl: 400 * 24 * 60 * 60 }).catch(() => {});
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

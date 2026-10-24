import { fetchArchiveDay } from "./veille.js";

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

  const result = await fetchArchiveDay(date, { ai: env?.AI });
  const recent = Date.now() - parsed.getTime() < 3 * 24 * 60 * 60 * 1000;
  return Response.json({ ...result, fetchedAt: new Date().toISOString() }, {
    status: result.available === 0 ? 503 : 200,
    headers: {
      "Cache-Control": result.available === 0
        ? "no-store"
        : recent ? "public, max-age=0, s-maxage=900" : "public, max-age=3600, s-maxage=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

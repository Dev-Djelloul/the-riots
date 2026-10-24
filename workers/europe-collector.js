import { EUROPE_COUNTRIES } from "../europe-countries.js";
import { fetchArchiveDay } from "../functions/api/veille.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const REQUEST_GAP_MS = 1_100;
const RETENTION_SECONDS = 400 * DAY_MS / 1000;
const BATCH_COUNT = 4;

export default {
  async scheduled(controller, env) {
    if (!env.GNEWS_API_KEY || !env.HISTORY) {
      throw new Error("GNEWS_API_KEY et HISTORY sont requis pour la collecte européenne.");
    }

    const date = new Date(controller.scheduledTime - DAY_MS).toISOString().slice(0, 10);
    const runHour = new Date(controller.scheduledTime).getUTCHours();
    const batchIndex = Math.floor(((runHour - 2 + 24) % 24) / 6);
    const batchSize = Math.ceil(EUROPE_COUNTRIES.length / BATCH_COUNT);
    const countries = EUROPE_COUNTRIES.slice(batchIndex * batchSize, (batchIndex + 1) * batchSize);
    const errors = [];
    let collected = 0;

    for (const [index, country] of countries.entries()) {
      const key = `coverage:${date}:${country.code}`;
      const existing = await env.HISTORY.get(key, "json");
      if (Array.isArray(existing)) {
        collected += 1;
        continue;
      }
      if (index > 0) await new Promise((resolve) => setTimeout(resolve, REQUEST_GAP_MS));
      const result = await fetchArchiveDay(date, {
        ai: env.AI,
        gnewsKey: env.GNEWS_API_KEY,
        countryCodes: [country.code],
        gnewsOnly: true,
      });
      if (result.provider !== "gnews" || result.errors?.length || result.available !== 1) {
        errors.push({ country: country.code, message: result.errors?.join("; ") || "aucune réponse GNews exploitable" });
        continue;
      }
      await env.HISTORY.put(
        key,
        JSON.stringify(result.articles),
        { expirationTtl: RETENTION_SECONDS },
      );
      collected += 1;
    }

    console.log(JSON.stringify({
      event: "europe_collection_complete",
      date,
      batch: batchIndex + 1,
      collected,
      total: countries.length,
      errors,
    }));
  },
};

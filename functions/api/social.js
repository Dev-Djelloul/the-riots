const PLATFORM_STATUS = {
  facebook: {
    id: "facebook",
    name: "Facebook",
    status: "authorization_required",
    message: "L’API Meta exige une application, un jeton autorisé et l’approbation Page Public Content Access pour les pages non gérées.",
    docs: "https://developers.facebook.com/docs/pages-api",
  },
  instagram: {
    id: "instagram",
    name: "Instagram",
    status: "authorization_required",
    message: "La recherche officielle par hashtag exige un compte Instagram professionnel lié à Meta, un jeton et les permissions d’accès aux contenus publics.",
    docs: "https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag-search/",
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    status: "authorization_required",
    message: "La recherche de vidéos publiques par mot-clé relève de la Research API, réservée aux projets de recherche approuvés par TikTok.",
    docs: "https://developers.tiktok.com/products/research-api/",
  },
  twitch: {
    id: "twitch",
    name: "Twitch",
    status: "configuration_required",
    message: "Configure TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET comme secrets Cloudflare Pages pour afficher les chaînes en direct trouvées.",
    docs: "https://dev.twitch.tv/docs/authentication/getting-tokens-oauth/#oauth-client-credentials-flow",
  },
};

export async function onRequestGet({ request, env }) {
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) || "manifestation France";
  const sources = Object.values(PLATFORM_STATUS).map((source) => ({ ...source }));
  const twitch = sources.find((source) => source.id === "twitch");

  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) {
    return Response.json({ query, articles: [], sources }, { headers: responseHeaders() });
  }

  try {
    const token = await getTwitchToken(env);
    const url = new URL("https://api.twitch.tv/helix/search/channels");
    url.searchParams.set("query", query);
    url.searchParams.set("live_only", "true");
    url.searchParams.set("first", "20");
    const response = await fetch(url, {
      headers: {
        "Client-ID": env.TWITCH_CLIENT_ID,
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Twitch API HTTP ${response.status}`);

    const payload = await response.json();
    const articles = (Array.isArray(payload.data) ? payload.data : [])
      .filter((channel) => channel.is_live && channel.broadcaster_login)
      .map((channel) => ({
        id: `twitch:${channel.id}`,
        title: channel.title || `Direct de ${channel.display_name}`,
        description: channel.game_name ? `En direct · ${channel.game_name}` : "Chaîne en direct",
        link: `https://www.twitch.tv/${encodeURIComponent(channel.broadcaster_login)}`,
        publishedAt: channel.started_at || new Date().toISOString(),
        sourceId: "twitch",
        sourceName: `Twitch · ${channel.display_name}`,
        platform: "twitch",
        type: "autre",
        matchedTerms: [query],
        image: channel.thumbnail_url?.replace("{width}", "640").replace("{height}", "360") || null,
        city: null,
        region: null,
        position: null,
      }));

    twitch.status = "ok";
    twitch.message = `${articles.length} chaîne(s) en direct correspondant à « ${query} ».`;
    return Response.json({ query, articles, sources }, { headers: responseHeaders() });
  } catch (error) {
    console.warn(JSON.stringify({ event: "social_source_unavailable", source: "twitch", message: String(error) }));
    twitch.status = "unavailable";
    twitch.message = "La recherche Twitch est temporairement indisponible. Réessaie plus tard.";
    return Response.json({ query, articles: [], sources }, { headers: responseHeaders() });
  }
}

async function getTwitchToken(env) {
  const body = new URLSearchParams({
    client_id: env.TWITCH_CLIENT_ID,
    client_secret: env.TWITCH_CLIENT_SECRET,
    grant_type: "client_credentials",
  });
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Twitch OAuth HTTP ${response.status}`);
  const payload = await response.json();
  if (typeof payload.access_token !== "string" || !payload.access_token) {
    throw new Error("Twitch OAuth response did not include an access token");
  }
  return payload.access_token;
}

function responseHeaders() {
  return {
    "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=30",
    "X-Content-Type-Options": "nosniff",
  };
}

import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { onRequestGet } from "../functions/api/social.js";

const originalFetch = globalThis.fetch;
const originalWarn = console.warn;

afterEach(() => {
  globalThis.fetch = originalFetch;
  console.warn = originalWarn;
});

test("explique les autorisations manquantes sans exposer de données", async () => {
  const response = await onRequestGet({
    request: new Request("https://veille.example/api/social?q=manifestation"),
    env: {},
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(payload.articles, []);
  assert.deepEqual(payload.sources.map((source) => source.id), ["facebook", "instagram", "tiktok", "twitch"]);
  assert.equal(payload.sources.find((source) => source.id === "twitch").status, "configuration_required");
  assert.ok(payload.sources.find((source) => source.id === "facebook").message.includes("approbation"));
});

test("recherche les chaînes Twitch en direct sans exposer les identifiants", async () => {
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    if (String(url).includes("oauth2/token")) {
      return Response.json({ access_token: "private-token", expires_in: 3600 });
    }
    return Response.json({
      data: [{
        id: "42",
        broadcaster_login: "livechannel",
        display_name: "Live Channel",
        title: "Manifestation en direct",
        game_name: "Just Chatting",
        started_at: "2026-10-19T20:00:00Z",
        is_live: true,
      }],
    });
  };

  const response = await onRequestGet({
    request: new Request("https://veille.example/api/social?q=manifestation%20France"),
    env: { TWITCH_CLIENT_ID: "client-id", TWITCH_CLIENT_SECRET: "private-secret" },
  });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.articles.length, 1);
  assert.equal(payload.articles[0].sourceName, "Twitch · Live Channel");
  assert.equal(payload.articles[0].link, "https://www.twitch.tv/livechannel");
  assert.equal(payload.sources.find((source) => source.id === "twitch").status, "ok");
  assert.equal(requests.length, 2);
  assert.match(requests[1].url, /query=manifestation\+France/);
  assert.equal(requests[1].options.headers.Authorization, "Bearer private-token");
  assert.equal(JSON.stringify(payload).includes("private-token"), false);
  assert.equal(JSON.stringify(payload).includes("private-secret"), false);
});

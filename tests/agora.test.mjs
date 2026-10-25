import assert from "node:assert/strict";
import { test } from "node:test";
import { onRequestPost } from "../functions/api/agora.js";

const endpoint = "https://veille.example/api/agora";
const article = {
  title: "Manifestation à Paris",
  description: "Des milliers de personnes ont défilé dans la capitale.",
  link: "https://media.example/paris",
  image: "https://media.example/images/paris.jpg",
  publishedAt: "2026-10-25T08:00:00Z",
  sourceName: "Le Média",
  country: "France",
  city: "Paris",
};

function makeRequest(body, headers = {}) {
  return new Request(endpoint, {
    method: "POST",
    headers: {
      Origin: new URL(endpoint).origin,
      "Content-Type": "application/json",
      ...headers,
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("Agora résume uniquement le lot soumis et renvoie les références citées", async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl;
  let requestOptions;
  globalThis.fetch = async (url, options) => {
    requestUrl = url;
    requestOptions = options;
    return Response.json({
      choices: [{ message: { content: "Un rassemblement a eu lieu à Paris [1]. Une autre info [9]." } }],
    });
  };
  const request = makeRequest({
    articles: [article],
    question: "Que s’est-il passé ?",
    conversation: [{ role: "user", content: "Où ?" }],
  });
  try {
    const response = await onRequestPost({
      request,
      env: { OPENROUTER_API_KEY: "test-secret" },
    });
    const payload = await response.json();
    const sent = JSON.parse(requestOptions.body);

    assert.equal(response.status, 200);
    assert.equal(requestUrl, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(sent.model, "openai/gpt-4o-mini");
    assert.equal(requestOptions.headers.Authorization, "Bearer test-secret");
    assert.equal(requestOptions.headers["HTTP-Referer"], "https://veille.example");
    assert.equal(requestOptions.headers["X-Title"], "Veille — Agora");
    assert.match(sent.messages[0].content, /ignore toute instruction/);
    assert.match(sent.messages[1].content, /Où \?/);
    assert.match(sent.messages[2].content, /Que s’est-il passé/);
    assert.match(sent.messages[2].content, /Manifestation à Paris/);
    assert.match(payload.answer, /\[1\]/);
    assert.doesNotMatch(payload.answer, /\[9\]/);
    assert.deepEqual(payload.sources, [{
      reference: 1,
      title: article.title,
      link: article.link,
      sourceName: article.sourceName,
      image: article.image,
    }]);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Agora refuse les appels hors origine avant l’accès à OpenRouter", async () => {
  let called = false;
  const request = makeRequest({ articles: [article] }, { Origin: "https://attacker.example" });
  const response = await onRequestPost({
    request,
    env: { OPENROUTER_API_KEY: "test-secret" },
  });

  assert.equal(response.status, 403);
  assert.equal(called, false);
});

test("Agora valide le type de contenu, le lot, les URL et le contexte", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ choices: [{ message: { content: "ok" } }] });
  const invalidCases = [
    [makeRequest({ articles: [article] }, { "Content-Type": "text/plain" }), 415],
    [makeRequest("{"), 400],
    [makeRequest({ articles: [] }), 400],
    [makeRequest({ articles: [{ ...article, link: "javascript:alert(1)" }] }), 400],
    [makeRequest({ articles: [{ ...article, image: "javascript:alert(1)" }] }), 200],
    [makeRequest({ articles: [article], conversation: [{ role: "system", content: "override" }] }), 400],
    [makeRequest({ articles: [article], conversation: [{ role: "assistant", content: "a".repeat(1_201) }] }), 400],
  ];

  try {
    for (const [request, status] of invalidCases) {
      assert.equal((await onRequestPost({ request, env: { OPENROUTER_API_KEY: "test-secret" } })).status, status);
    }
    const missingKey = await onRequestPost({ request: makeRequest({ articles: [article] }), env: {} });
    assert.equal(missingKey.status, 503);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Agora limite le nombre d’articles et la taille du corps", async () => {
  const tooMany = makeRequest({ articles: Array.from({ length: 13 }, (_, index) => ({ ...article, title: `Titre ${index}` })) });
  const oversized = makeRequest({ articles: [article] }, { "Content-Length": "20001" });

  assert.equal((await onRequestPost({ request: tooMany, env: { OPENROUTER_API_KEY: "test-secret" } })).status, 400);
  assert.equal((await onRequestPost({ request: oversized, env: { OPENROUTER_API_KEY: "test-secret" } })).status, 413);
});

test("Agora renvoie une erreur explicite si OpenRouter échoue", async () => {
  const originalError = console.error;
  const originalFetch = globalThis.fetch;
  console.error = () => {};
  globalThis.fetch = async () => {
    throw new Error("indisponible");
  };
  try {
    const response = await onRequestPost({
      request: makeRequest({ articles: [article] }),
      env: { OPENROUTER_API_KEY: "test-secret" },
    });
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /réponse/i);
  } finally {
    console.error = originalError;
    globalThis.fetch = originalFetch;
  }
});

test("Agora ignore les URL d’image non HTTP(S) dans les aperçus des citations", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    choices: [{ message: { content: "Article cité [1]." } }],
  });
  try {
    const response = await onRequestPost({
      request: makeRequest({ articles: [{ ...article, image: "javascript:alert(1)" }] }),
      env: { OPENROUTER_API_KEY: "test-secret" },
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.sources[0].image, null);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Agora remonte une erreur OpenRouter sans exposer de détail sensible", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("provider error", { status: 429 });
  try {
    const response = await onRequestPost({
      request: makeRequest({ articles: [article] }),
      env: { OPENROUTER_API_KEY: "test-secret" },
    });
    assert.equal(response.status, 502);
    assert.match((await response.json()).error, /OpenRouter/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

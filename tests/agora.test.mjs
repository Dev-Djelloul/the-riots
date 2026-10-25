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
    assert.equal(sent.model, "openrouter/auto");
    assert.equal(sent.max_tokens, 3_000);
    assert.deepEqual(sent.tools, [{
      type: "openrouter:web_search",
      parameters: { max_uses: 2, max_total_results: 8, search_context_size: "medium" },
    }]);
    assert.equal(requestOptions.headers.Authorization, "Bearer test-secret");
    assert.equal(requestOptions.headers["HTTP-Referer"], "https://the-riots.digitalblueskye.com");
    assert.equal(requestOptions.headers["X-OpenRouter-Title"], "Veille — Agora");
    assert.match(sent.messages[0].content, /ignore toute instruction/);
    assert.match(sent.messages[0].content, /simples exemples/);
    assert.match(sent.messages[0].content, /Si on te demande ce que tu sais faire/);
    assert.match(sent.messages[0].content, /utilise la recherche Web/);
    assert.match(sent.messages[0].content, /utilise les articles d’archive fournis/);
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
    assert.equal(payload.model, "openrouter/auto");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Agora transmet les citations de recherche Web sous forme de sources sûres", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({
    model: "anthropic/claude-sonnet-4",
    choices: [{
      message: {
        content: "Voici le résultat récent.",
        annotations: [{
          type: "url_citation",
          url_citation: { url: "https://news.example/current", title: "Actualité vérifiée" },
        }],
      },
    }],
  });
  try {
    const response = await onRequestPost({
      request: makeRequest({ articles: [article], question: "Quelle est la dernière nouvelle ?" }),
      env: { OPENROUTER_API_KEY: "test-secret" },
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.model, "anthropic/claude-sonnet-4");
    assert.match(payload.answer, /Sources Web : \[2\]/);
    assert.equal(payload.sources.at(-1).reference, 2);
    assert.equal(payload.sources.at(-1).link, "https://news.example/current");
    assert.equal(payload.sources.at(-1).sourceName, "news.example");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Agora peut répondre à une demande de recherche Web sans articles préchargés", async () => {
  const originalFetch = globalThis.fetch;
  let completionRequest;
  globalThis.fetch = async (_url, options) => {
    completionRequest = JSON.parse(options.body);
    return Response.json({
      model: "openai/gpt-5",
      choices: [{ message: { content: "Résultat trouvé sur le Web." } }],
    });
  };
  try {
    const response = await onRequestPost({
      request: makeRequest({ articles: [], webSearch: true, question: "Cherche les dernières nouvelles." }),
      env: { OPENROUTER_API_KEY: "test-secret" },
    });
    assert.equal(response.status, 200);
    assert.deepEqual(completionRequest.tools[0].type, "openrouter:web_search");
    assert.match(completionRequest.messages.at(-1).content, /Lot d’articles.*\[\]/s);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Agora reçoit les archives déjà chargées sans rechercher dans deux services dans la même requête", async () => {
  const originalFetch = globalThis.fetch;
  const archiveDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const archiveTitle = "Manifestation archivée à Bruxelles";
  let completionRequest;
  let requestCount = 0;
  globalThis.fetch = async (_url, options = {}) => {
    requestCount += 1;
    completionRequest = JSON.parse(options.body);
    return Response.json({
      model: "openai/gpt-5",
      choices: [{ message: { content: "Événement archivé [1]." } }],
    });
  };
  const archivedArticle = { ...article, title: archiveTitle, link: "https://archive.example/article", archive: true };
  try {
    const response = await onRequestPost({
      request: makeRequest({ articles: [archivedArticle], archiveDate, webSearch: false, question: "Que s’est-il passé ?" }),
      env: { OPENROUTER_API_KEY: "test-secret" },
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(requestCount, 1);
    assert.equal(completionRequest.model, "openrouter/auto");
    assert.equal(completionRequest.tools, undefined);
    assert.match(completionRequest.messages.at(-1).content, new RegExp(archiveDate));
    assert.match(completionRequest.messages.at(-1).content, new RegExp(archiveTitle));
    assert.match(completionRequest.messages.at(-1).content, /articles archivés sont inclus/);
    assert.equal(payload.sources[0].link, archivedArticle.link);
    assert.equal(payload.model, "openai/gpt-5");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Agora signale une archive indisponible et conserve l’accès à la recherche Web", async () => {
  const originalFetch = globalThis.fetch;
  let completionRequest;
  globalThis.fetch = async (_url, options) => {
    completionRequest = JSON.parse(options.body);
    return Response.json({
      choices: [{ message: { content: "Je n’ai pas pu consulter cette archive." } }],
    });
  };
  try {
    const response = await onRequestPost({
      request: makeRequest({
        articles: [],
        archiveDate: "2026-10-14",
        archiveUnavailable: true,
        webSearch: true,
        question: "Que s’est-il passé ?",
      }),
      env: { OPENROUTER_API_KEY: "test-secret" },
    });
    assert.equal(response.status, 200);
    assert.match(completionRequest.messages.at(-1).content, /archives n’ont pas pu être chargées/);
    assert.deepEqual(completionRequest.tools[0].type, "openrouter:web_search");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Agora conserve les réponses longues et signale la limite du modèle", async () => {
  const originalFetch = globalThis.fetch;
  const longAnswer = "x".repeat(9_000);
  globalThis.fetch = async () => Response.json({
    choices: [{ message: { content: longAnswer }, finish_reason: "length" }],
  });
  try {
    const response = await onRequestPost({
      request: makeRequest({ articles: [article] }),
      env: { OPENROUTER_API_KEY: "test-secret" },
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.answer.length, longAnswer.length);
    assert.equal(payload.incomplete, true);
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
  const tooMany = makeRequest({ articles: Array.from({ length: 25 }, (_, index) => ({ ...article, title: `Titre ${index}` })) });
  const oversized = makeRequest({ articles: [article] }, { "Content-Length": "60001" });

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

const COLORS = {
  rassemblement: "dot-amber",
  tensions: "dot-coral",
  degradations: "dot-lilac",
  autre: "all-dot",
};

const TYPE_LABELS = {
  rassemblement: "Rassemblement évoqué",
  tensions: "Tensions / violences évoquées",
  degradations: "Dégâts évoqués",
  autre: "Sujet associé",
};

const state = {
  articles: [],
  sources: [],
  period: "all",
  type: "all",
  query: "",
  selected: null,
  newestFirst: true,
  fetchedAt: null,
};

const feed = document.querySelector("#feed-list");
const markers = document.querySelector("#map-markers");
const emptyState = document.querySelector("#empty-state");
const refreshButton = document.querySelector("#refresh-button");

function getVisibleArticles() {
  const now = Date.now();
  return state.articles
    .filter((article) => {
      if (state.period === "all") return true;
      const age = now - Date.parse(article.publishedAt);
      return state.period === "today" ? age < 24 * 60 * 60 * 1000 : age < 7 * 24 * 60 * 60 * 1000;
    })
    .filter((article) => state.type === "all" || article.type === state.type)
    .filter((article) => {
      const searchable = `${article.title} ${article.description} ${article.city || ""} ${article.region || ""} ${article.sourceName} ${article.matchedTerms.join(" ")}`.toLocaleLowerCase("fr");
      return searchable.includes(state.query);
    })
    .sort((a, b) => {
      const delta = Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
      return state.newestFirst ? delta : -delta;
    });
}

function render() {
  const articles = getVisibleArticles();
  feed.replaceChildren(...articles.map(createArticleCard));
  const mapped = articles.filter((article) => article.position);
  const cityGroups = [...mapped.reduce((groups, article) => {
    const group = groups.get(article.city) || [];
    group.push(article);
    groups.set(article.city, group);
    return groups;
  }, new Map()).values()];
  markers.replaceChildren(...cityGroups.map(createMarker));
  const isEmpty = articles.length === 0;
  emptyState.hidden = !isEmpty;
  feed.hidden = isEmpty;
  document.querySelector("#empty-title").textContent = state.articles.length === 0 ? "Aucun article disponible" : "Aucun résultat";
  document.querySelector("#empty-message").textContent = state.articles.length === 0
    ? "Les flux n’ont retourné aucun article correspondant. Vérifie les sources ou réessaie plus tard."
    : "Essaie une autre recherche ou modifie les filtres.";
  document.querySelector("#reset-filters").hidden = state.articles.length === 0;
  document.querySelector("#feed-count").textContent = String(articles.length).padStart(2, "0");
  document.querySelector("#map-result-count").textContent = `${cityGroups.length} VILLE${cityGroups.length === 1 ? "" : "S"} · ${mapped.length} ARTICLE${mapped.length === 1 ? "" : "S"}`;
  document.querySelector("#count-all").textContent = String(state.articles.length).padStart(2, "0");
  renderSources();
}

function createArticleCard(article) {
  const card = document.createElement("article");
  card.className = `event-card${state.selected === article.id ? " selected" : ""}`;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "event-summary";
  toggle.setAttribute("aria-expanded", String(state.selected === article.id));

  const meta = document.createElement("div");
  meta.className = "event-meta";
  const type = document.createElement("span");
  type.className = "event-type";
  const dot = document.createElement("span");
  dot.className = `type-dot ${COLORS[article.type] || COLORS.autre}`;
  type.append(dot, document.createTextNode(TYPE_LABELS[article.type] || TYPE_LABELS.autre));
  const time = document.createElement("time");
  time.className = "event-time";
  time.dateTime = article.publishedAt;
  time.textContent = formatDate(article.publishedAt);
  meta.append(type, time);

  const title = document.createElement("h3");
  title.className = "event-title";
  title.textContent = article.title;
  const place = document.createElement("div");
  place.className = "event-place";
  const placeIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  placeIcon.setAttribute("viewBox", "0 0 16 16");
  placeIcon.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", "M13 6.7c0 3.4-5 7.3-5 7.3S3 10.1 3 6.7a5 5 0 1 1 10 0Z");
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", "8");
  circle.setAttribute("cy", "6.5");
  circle.setAttribute("r", "1.6");
  placeIcon.append(path, circle);
  const placeText = document.createElement("span");
  placeText.textContent = article.city
    ? `${article.city} · repère approximatif`
    : "France · lieu non précisé dans le titre";
  place.append(placeIcon, placeText);
  toggle.append(meta, title, place);
  card.append(toggle);

  const excerpt = document.createElement("p");
  excerpt.className = "article-excerpt";
  excerpt.textContent = article.description || "Ce flux ne fournit pas d’extrait pour cet article.";
  card.append(excerpt);

  const attribution = document.createElement("div");
  attribution.className = "article-attribution";
  const publisher = document.createElement("span");
  publisher.className = "article-publisher";
  publisher.textContent = article.sourceName;
  const source = document.createElement("a");
  source.className = "event-source";
  source.href = article.link;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  source.textContent = "Lire l’article complet ↗";
  attribution.append(publisher, source);
  card.append(attribution);

  if (state.selected === article.id) {
    const detail = document.createElement("div");
    detail.className = "event-detail";
    const tags = document.createElement("div");
    tags.className = "event-tags";
    for (const term of article.matchedTerms.slice(0, 4)) {
      const badge = document.createElement("span");
      badge.textContent = term;
      tags.append(badge);
    }
    const disclaimer = document.createElement("p");
    disclaimer.className = "article-disclaimer";
    disclaimer.textContent = "Mots-clés de veille uniquement : ce classement ne vérifie pas le contenu de l’article.";
    detail.append(tags, disclaimer);
    card.append(detail);
  }

  toggle.addEventListener("click", () => {
    state.selected = state.selected === article.id ? null : article.id;
    render();
  });
  return card;
}

function createMarker(articles, index) {
  const article = articles[0];
  const selected = articles.some((item) => state.selected === item.id);
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.classList.add("map-marker");
  if (selected) group.classList.add("selected");
  group.setAttribute("transform", `translate(${article.position[0]} ${article.position[1]})`);
  group.setAttribute("tabindex", "0");
  group.setAttribute("role", "button");
  group.setAttribute("aria-label", `${article.city}, cité dans ${articles.length} titre${articles.length === 1 ? "" : "s"}`);
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = `${article.city} — ${articles.length} article${articles.length === 1 ? "" : "s"}`;
  const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  halo.setAttribute("r", "15");
  halo.setAttribute("class", "marker-halo");
  halo.style.animationDelay = `${index * -0.65}s`;
  const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  ring.setAttribute("r", "7");
  ring.setAttribute("class", "marker-ring");
  const core = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  core.setAttribute("r", "3.5");
  core.setAttribute("class", "marker-core");
  group.append(title, halo, ring, core);

  const select = () => {
    state.selected = articles.some((item) => item.id === state.selected) ? null : article.id;
    render();
  };
  group.addEventListener("click", select);
  group.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      select();
    }
  });
  return group;
}

function renderSources() {
  const list = document.querySelector("#source-list");
  list.replaceChildren(...state.sources.map((source) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = source.name;
    link.title = `${source.kind} — ouvrir le site`;
    const status = document.createElement("span");
    status.className = `source-status ${source.status}`;
    status.textContent = source.status === "ok" ? String(source.articleCount) : "!";
    status.setAttribute("aria-label", source.status === "ok"
      ? `${source.articleCount} article(s) correspondant(s)`
      : "Flux temporairement indisponible");
    item.append(link, status);
    return item;
  }));
  document.querySelector("#source-count").textContent = `${state.sources.length} MÉDIAS`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Date indisponible";
  const age = Date.now() - date.getTime();
  if (age >= 0 && age < 24 * 60 * 60 * 1000) {
    return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(date);
  }
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(date);
}

function updateStatus(kind, message) {
  const labels = {
    loading: "ACTUALISATION",
    ready: "SOURCES CONNECTÉES",
    partial: "FLUX PARTIEL",
    error: "SOURCES INDISPONIBLES",
  };
  document.querySelector("#status-label").textContent = labels[kind];
  document.querySelector("#refresh-state").textContent = message;
  document.querySelector(".status-icon").classList.toggle("status-error", kind === "error");
  document.querySelector(".status-icon").classList.toggle("status-loading", kind === "loading");
}

async function loadArticles() {
  refreshButton.disabled = true;
  refreshButton.classList.add("refreshing");
  updateStatus("loading", "Interrogation des flux RSS…");
  if (state.articles.length === 0) {
    emptyState.hidden = false;
    feed.hidden = true;
    document.querySelector("#empty-title").textContent = "Chargement des flux";
    document.querySelector("#empty-message").textContent = "Récupération des articles publiés par les médias suivis.";
  }

  try {
    const response = await fetch("/api/veille", { headers: { Accept: "application/json" } });
    const payload = await response.json();
    if (!response.ok && response.status !== 503) throw new Error(`Réponse inattendue (${response.status})`);
    state.articles = Array.isArray(payload.articles) ? payload.articles : [];
    state.sources = Array.isArray(payload.sources) ? payload.sources : [];
    state.fetchedAt = payload.fetchedAt || null;
    if (response.status === 503) {
      updateStatus("error", "Aucun flux disponible — réessaie dans quelques minutes.");
    } else if (payload.warning) {
      updateStatus("partial", `${payload.warning} Actualisé ${formatClock(state.fetchedAt)}.`);
    } else {
      updateStatus("ready", `7 médias · actualisé ${formatClock(state.fetchedAt)}.`);
    }
    render();
  } catch (error) {
    console.error("Impossible de charger la veille de presse.", error);
    updateStatus("error", "Connexion impossible — vérifie le serveur et réessaie.");
    if (state.articles.length === 0) {
      document.querySelector("#empty-title").textContent = "Flux indisponibles";
      document.querySelector("#empty-message").textContent = "La veille n’a pas pu joindre les sources. Réessaie dans quelques instants.";
      emptyState.hidden = false;
      feed.hidden = true;
      document.querySelector("#reset-filters").hidden = true;
    }
  } finally {
    refreshButton.disabled = false;
    refreshButton.classList.remove("refreshing");
  }
}

function formatClock(value) {
  if (!value) return "à l’instant";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

document.querySelector("#period-filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-period]");
  if (!button) return;
  state.period = button.dataset.period;
  document.querySelectorAll("[data-period]").forEach((item) => item.classList.toggle("active", item === button));
  render();
});

document.querySelector("#type-filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-type]");
  if (!button) return;
  state.type = button.dataset.type;
  document.querySelectorAll("[data-type]").forEach((item) => item.classList.toggle("active", item === button));
  render();
});

document.querySelector("#search-input").addEventListener("input", (event) => {
  state.query = event.target.value.trim().toLocaleLowerCase("fr");
  render();
});

document.querySelector("#sort-button").addEventListener("click", () => {
  state.newestFirst = !state.newestFirst;
  render();
});

document.querySelector("#reset-filters").addEventListener("click", () => {
  state.period = "all";
  state.type = "all";
  state.query = "";
  state.selected = null;
  document.querySelector("#search-input").value = "";
  document.querySelectorAll("[data-period]").forEach((item) => item.classList.toggle("active", item.dataset.period === "all"));
  document.querySelectorAll("[data-type]").forEach((item) => item.classList.toggle("active", item.dataset.type === "all"));
  render();
});

refreshButton.addEventListener("click", loadArticles);

const aboutDialog = document.querySelector("#about-dialog");
document.querySelector("#about-button").addEventListener("click", () => aboutDialog.showModal());
document.querySelector("#dialog-close").addEventListener("click", () => aboutDialog.close());
aboutDialog.addEventListener("click", (event) => {
  if (event.target === aboutDialog) aboutDialog.close();
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    document.querySelector("#search-input").focus();
  }
});

loadArticles();
window.setInterval(() => {
  if (document.visibilityState === "visible") loadArticles();
}, 5 * 60 * 1000);

import { createGeographyIndex, createSpectrumPalette, locateArticle } from "./geography.js";

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

const LIVE_CHANNELS = {
  franceinfo: {
    id: "UCO6K_kkdP-lnSCiO3tPx7WA",
    name: "franceinfo",
    liveUrl: "https://www.youtube.com/@franceinfo/live",
  },
  bfmtv: {
    name: "BFMTV",
    id: "UCXwDLMDV86ldKoFVc_g8P0g",
    liveUrl: "https://www.youtube.com/@BFMTV/live",
  },
  cnews: {
    name: "CNEWS",
    id: "UCXKJrYczY2_fJEZgFPGY0HQ",
    liveUrl: "https://www.youtube.com/@CNEWSofficiel/live",
  },
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
const mapElement = document.querySelector("#france-map");
const visualFeed = document.querySelector("#visual-feed");
const mapEmpty = document.querySelector("#map-empty");
const mapDataWarning = document.querySelector("#map-data-warning");
const emptyState = document.querySelector("#empty-state");
const refreshButton = document.querySelector("#refresh-button");
const L = window.L;
const map = window.L
  ? L.map(mapElement, { scrollWheelZoom: false }).fitBounds([[41.2, -5.5], [51.3, 9.8]], { padding: [12, 12] })
  : null;
const communeMarkerLayer = map ? L.layerGroup().addTo(map) : null;
const departmentLayers = new Map();
let departmentArticlesByCode = new Map();
let departmentColors = new Map();
let geographyIndex = null;
let geographyPromise = Promise.resolve(null);

if (map) {
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    updateWhenIdle: true,
  }).addTo(map);
  map.on("tileerror", () => {
    document.querySelector("#map-tile-warning").hidden = false;
  });
  map.on("tileload", () => {
    document.querySelector("#map-tile-warning").hidden = true;
  });
  geographyPromise = loadGeography();
} else {
  mapEmpty.hidden = false;
  mapEmpty.textContent = "La carte n’a pas pu être chargée. Vérifie ta connexion puis actualise la page.";
}

async function loadGeography() {
  try {
    const [communesResponse, departmentsResponse] = await Promise.all([
      fetch("/data/communes.json"),
      fetch("/data/departements.geojson"),
    ]);
    if (!communesResponse.ok || !departmentsResponse.ok) {
      throw new Error(`Données géographiques indisponibles (${communesResponse.status}/${departmentsResponse.status})`);
    }
    const [communes, departments] = await Promise.all([
      communesResponse.json(),
      departmentsResponse.json(),
    ]);
    if (!Array.isArray(communes) || departments.features?.length !== 96) {
      throw new Error("Le jeu de données ne contient pas les 96 départements métropolitains attendus.");
    }
    geographyIndex = createGeographyIndex(communes, departments);
    L.geoJSON(departments, {
      style: departmentStyle,
      onEachFeature(feature, layer) {
        const { code, nom } = feature.properties;
        departmentLayers.set(code, layer);
        layer.bindPopup(createLocationPopup(nom, [], "department"));
        layer.on("click", () => {
          const group = departmentArticlesByCode.get(code);
          layer.setPopupContent(createLocationPopup(nom, group?.articles || [], "department"));
        });
      },
    }).addTo(map);
    map.fitBounds(departmentLayers.size ? L.featureGroup([...departmentLayers.values()]).getBounds().pad(0.04) : [[41.2, -5.5], [51.3, 9.8]]);
    render();
    return geographyIndex;
  } catch (error) {
    console.error("Impossible de charger les données géographiques.", error);
    mapDataWarning.hidden = false;
    mapDataWarning.textContent = "Limites administratives indisponibles · réessaie après actualisation";
    return null;
  }
}

function departmentStyle(feature) {
  const count = departmentArticlesByCode.get(feature.properties.code)?.articles.length || 0;
  const color = departmentColors.get(feature.properties.code);
  const selected = state.articles.some((article) => article.id === state.selected
    && article.location?.places.some((place) => place.departmentCode === feature.properties.code));
  return {
    color: selected ? "#ffffff" : color || "#73766e",
    weight: selected ? 2.2 : count ? 1.8 : 0.7,
    opacity: count ? 1 : 0.65,
    fillColor: color || "#777a70",
    fillOpacity: count ? 0.32 : 0.025,
  };
}

function getVisibleArticles() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  return state.articles
    .filter((article) => {
      if (state.period === "all") return true;
      const publishedAt = Date.parse(article.publishedAt);
      if (!Number.isFinite(publishedAt) || publishedAt > now.getTime()) return false;
      if (state.period === "today") return publishedAt >= startOfToday && publishedAt < startOfTomorrow;
      if (state.period === "week") return publishedAt >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return false;
    })
    .filter((article) => state.type === "all" || article.type === state.type)
    .filter((article) => {
      const placeNames = article.location?.places.map((place) => place.name).join(" ") || article.location?.label || "";
      const searchable = `${article.title} ${article.description} ${placeNames} ${article.sourceName} ${article.matchedTerms.join(" ")}`.toLocaleLowerCase("fr");
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
  renderVisuals(articles);
  const mapped = articles.filter((article) => article.location?.places.length);
  const mapStats = renderMap(articles);
  mapEmpty.hidden = Boolean(map) && mapped.length > 0;
  mapEmpty.innerHTML = geographyIndex
    ? "Aucun lieu suffisamment précis cité dans les titres ou extraits.<br /><span>Les limites des 96 départements restent visibles ; les zones colorées reflètent les mentions d’articles, pas des événements vérifiés.</span>"
    : "Données géographiques indisponibles.<br /><span>Les articles restent consultables ; réessaie après actualisation.</span>";
  const isEmpty = articles.length === 0;
  emptyState.hidden = !isEmpty;
  feed.hidden = isEmpty;
  document.querySelector("#empty-title").textContent = state.articles.length === 0 ? "Aucun article disponible" : "Aucun résultat";
  document.querySelector("#empty-message").textContent = state.articles.length === 0
    ? "Les flux n’ont retourné aucun article correspondant. Vérifie les sources ou réessaie plus tard."
    : "Essaie une autre recherche ou modifie les filtres.";
  document.querySelector("#reset-filters").hidden = state.articles.length === 0;
  document.querySelector("#feed-count").textContent = String(articles.length).padStart(2, "0");
  document.querySelector("#map-result-count").textContent = `${mapStats.communeCount} COMMUNE${mapStats.communeCount === 1 ? "" : "S"} · ${mapStats.departmentCount} DÉPARTEMENT${mapStats.departmentCount === 1 ? "" : "S"} · ${mapped.length} ARTICLE${mapped.length === 1 ? "" : "S"} LOCALISÉ${mapped.length === 1 ? "" : "S"}`;
  document.querySelector("#count-all").textContent = String(state.articles.length).padStart(2, "0");
  renderSources();
}

function renderSocial(payload) {
  const container = document.querySelector("#social-feed");
  const twitchSource = payload.sources?.find((source) => source.id === "twitch");
  const twitchStatus = document.querySelector('[data-social-status="twitch"]');
  if (twitchSource) {
    twitchStatus.textContent = twitchSource.message;
    twitchStatus.className = `social-platform-status ${twitchSource.status}`;
  }
  container.replaceChildren();
  if (payload.articles?.length) {
    const heading = document.createElement("h3");
    heading.className = "social-feed-heading";
    heading.textContent = `Twitch · directs en cours pour « ${payload.query} »`;
    const grid = document.createElement("div");
    grid.className = "social-result-grid";
    for (const article of payload.articles) {
      const link = document.createElement("a");
      link.className = "social-result";
      link.href = article.link;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      if (isSafeImageUrl(article.image)) {
        const image = document.createElement("img");
        image.className = "social-result-image";
        image.src = article.image;
        image.alt = "";
        image.loading = "lazy";
        image.referrerPolicy = "no-referrer";
        link.append(image);
      } else {
        const placeholder = document.createElement("span");
        placeholder.className = "social-result-placeholder";
        placeholder.textContent = "DIRECT";
        link.append(placeholder);
      }
      const title = document.createElement("strong");
      title.textContent = article.title;
      const meta = document.createElement("span");
      meta.textContent = `${article.sourceName} · ${article.description}`;
      link.append(title, meta);
      grid.append(link);
    }
    container.append(heading, grid);
  }
}

async function loadSocial(query = "manifestation France") {
  const container = document.querySelector("#social-feed");
  try {
    const response = await fetch(`/api/social?q=${encodeURIComponent(query)}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Réponse inattendue (${response.status})`);
    renderSocial(await response.json());
  } catch (error) {
    console.error("Impossible de charger les sources sociales.", error);
    const status = document.querySelector('[data-social-status="twitch"]');
    status.textContent = "Vérification de la source impossible.";
    status.className = "social-platform-status unavailable";
    container.replaceChildren();
  }
}

function renderVisuals(articles) {
  const selected = articles.slice(0, 3);
  visualFeed.className = `visual-grid visual-count-${selected.length}`;
  if (selected.length === 0) {
    const empty = document.createElement("div");
    empty.className = "visual-empty";
    empty.textContent = "Les aperçus apparaîtront ici dès qu’un flux publiera un article illustré.";
    visualFeed.replaceChildren(empty);
  } else {
    visualFeed.replaceChildren(...selected.map((article, index) => createVisualCard(article, index)));
  }
  document.querySelector("#visual-count").textContent = String(selected.length).padStart(2, "0");
}

function createVisualCard(article, index) {
  const card = document.createElement("a");
  card.className = `visual-card${index === 0 ? " visual-card-featured" : ""}`;
  card.href = article.link;
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.setAttribute("aria-label", `${article.sourceName} : ${article.title}. Ouvrir l’article complet.`);

  const media = document.createElement("div");
  media.className = `visual-media visual-tone-${article.type || "autre"}`;
  const placeholder = document.createElement("div");
  placeholder.className = "visual-placeholder";
  const initials = document.createElement("span");
  initials.className = "visual-initials";
  initials.textContent = article.sourceName.slice(0, 2).toLocaleUpperCase("fr");
  const placeholderLabel = document.createElement("span");
  placeholderLabel.className = "visual-placeholder-label";
  placeholderLabel.textContent = "APERÇU NON FOURNI PAR LE FLUX";
  placeholder.append(initials, placeholderLabel);
  media.append(placeholder);

  if (isSafeImageUrl(article.image)) {
    const image = document.createElement("img");
    image.className = "visual-image";
    image.src = article.image;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.referrerPolicy = "no-referrer";
    image.addEventListener("load", () => placeholder.remove(), { once: true });
    image.addEventListener("error", () => image.remove(), { once: true });
    media.prepend(image);
  }

  const shade = document.createElement("div");
  shade.className = "visual-shade";
  const caption = document.createElement("div");
  caption.className = "visual-caption";
  const meta = document.createElement("span");
  meta.className = "visual-meta";
  meta.textContent = `${article.sourceName} · ${formatDate(article.publishedAt, article.datePrecision)}`;
  const title = document.createElement("span");
  title.className = "visual-title";
  title.textContent = article.title;
  const linkHint = document.createElement("span");
  linkHint.className = "visual-link-hint";
  linkHint.textContent = "Ouvrir la source ↗";
  caption.append(meta, title, linkHint);
  media.append(shade, caption);
  card.append(media);
  return card;
}

function isSafeImageUrl(value) {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
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
  time.textContent = formatDate(article.publishedAt, article.datePrecision);
  if (article.datePrecision === "day") {
    time.title = "Date estimée depuis l’URL de l’article ; le flux RSS ne fournit pas d’heure.";
  }
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
  const location = article.location || { precision: "unknown", places: [] };
  const placeNames = location.places.map((place) => place.name).join(", ");
  placeText.textContent = location.precision === "commune"
    ? `Commune citée : ${placeNames}`
    : location.precision === "department"
      ? `Département cité : ${placeNames}`
      : location.precision === "ambiguous"
        ? `Lieu ambigu, non cartographié : ${location.label}`
        : "Lieu non identifié dans le titre ou l’extrait";
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

function renderMap(articles) {
  if (!map || !communeMarkerLayer) return { communeCount: 0, departmentCount: 0 };
  communeMarkerLayer.clearLayers();
  const communes = new Map();
  const departments = new Map();
  const addArticle = (groups, place, article) => {
    const group = groups.get(place.code) || { place, articles: new Map() };
    group.articles.set(article.id, article);
    groups.set(place.code, group);
  };

  for (const article of articles) {
    for (const place of article.location?.places || []) {
      const department = geographyIndex?.departmentByCode.get(place.departmentCode);
      const departmentName = place.precision === "department" ? place.name : department?.name;
      if (departmentName) {
        const departmentPlace = { code: place.departmentCode, name: departmentName };
        addArticle(departments, departmentPlace, article);
      }
      if (place.precision === "commune") addArticle(communes, place, article);
    }
  }

  departmentArticlesByCode = departments;
  departmentColors = createSpectrumPalette(departments.keys());
  for (const [code, layer] of departmentLayers) {
    const group = departments.get(code);
    layer.setStyle(departmentStyle({ properties: { code } }));
    layer.setPopupContent(createLocationPopup(
      group?.place.name || layer.feature.properties.nom,
      group ? [...group.articles.values()] : [],
      "department",
    ));
  }

  for (const group of communes.values()) {
    const articlesForPlace = [...group.articles.values()];
    const selected = articlesForPlace.some((article) => article.id === state.selected);
    const color = departmentColors.get(group.place.departmentCode) || "#c8c8be";
    const marker = L.marker(group.place.coordinates, {
      icon: L.divIcon({
        className: "map-commune-marker",
        html: `<span class="${selected ? "selected" : ""}" style="--marker-color:${color}"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
      title: `${group.place.name} · ${articlesForPlace.length} article${articlesForPlace.length === 1 ? "" : "s"}`,
      alt: `Articles mentionnant ${group.place.name}`,
    });
    marker.bindPopup(createLocationPopup(group.place.name, articlesForPlace, "commune"), {
      maxWidth: 360,
      minWidth: 240,
      autoPan: true,
      autoPanPadding: [24, 24],
      keepInView: true,
    });
    marker.addTo(communeMarkerLayer);
  }

  return { communeCount: communes.size, departmentCount: departments.size };
}

function createLocationPopup(name, articles, precision) {
  const popup = document.createElement("div");
  popup.className = "map-popup";
  const heading = document.createElement("strong");
  heading.textContent = `${name} · ${articles.length} article${articles.length === 1 ? "" : "s"}`;
  const note = document.createElement("p");
  note.textContent = precision === "commune"
    ? "La commune est citée dans le titre ou l’extrait ; sa limite et son emplacement exact ne sont pas représentés."
    : "La couleur distingue ce département parmi ceux cités dans les articles ; elle ne représente ni une intensité ni un décompte d’événements vérifiés.";
  const list = document.createElement("ul");
  articles.forEach((article) => {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = article.link;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = article.title;
    item.append(link);
    list.append(item);
  });
  popup.append(heading, note);
  if (articles.length) popup.append(list);
  return popup;
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

function formatDate(dateString, precision = "minute") {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Date indisponible";
  if (precision === "day") {
    return `${new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(date)} · date estimée`;
  }
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
    const [response, geography] = await Promise.all([
      fetch("/api/veille", { headers: { Accept: "application/json" } }),
      geographyPromise,
    ]);
    const payload = await response.json();
    if (!response.ok && response.status !== 503) throw new Error(`Réponse inattendue (${response.status})`);
    state.articles = Array.isArray(payload.articles)
      ? payload.articles.map((article) => ({
        ...article,
        location: geography ? locateArticle(article, geography) : { precision: "unknown", places: [] },
      }))
      : [];
    state.sources = Array.isArray(payload.sources) ? payload.sources : [];
    state.fetchedAt = payload.fetchedAt || null;
    if (response.status === 503) {
      updateStatus("error", "Aucun flux disponible — réessaie dans quelques minutes.");
    } else if (payload.warning) {
      updateStatus("partial", `${payload.warning} Actualisé ${formatClock(state.fetchedAt)}.`);
    } else {
      updateStatus("ready", `${state.sources.length} médias · actualisé ${formatClock(state.fetchedAt)}.`);
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
    loadSocial(document.querySelector("#social-query").value.trim() || "manifestation France");
  }
}

function formatClock(value) {
  if (!value) return "à l’instant";
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

document.querySelector("#period-filters").addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("[data-period]") : null;
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

const socialQuery = document.querySelector("#social-query");
const socialHashtags = ["emeutes", "emeutesfrance", "violencesurbaines", "manifestation", "tensionsurbaines"];
const socialSearchUrls = {
  facebook: (tag) => `https://www.facebook.com/search/posts/?q=${encodeURIComponent(`#${tag}`)}`,
  instagram: (tag) => `https://www.instagram.com/explore/search/keyword/?q=${encodeURIComponent(tag)}`,
  tiktok: (tag) => `https://www.tiktok.com/search?q=${encodeURIComponent(`#${tag}`)}`,
  twitch: (tag) => `https://www.twitch.tv/search?term=${encodeURIComponent(tag)}`,
};

function updateSocialSearchLinks() {
  document.querySelectorAll("[data-social-links]").forEach((container) => {
    const platform = container.dataset.socialLinks;
    const createLink = (label, url) => {
      const link = document.createElement("a");
      link.className = "social-platform-action";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = label;
      return link;
    };

    container.replaceChildren(...socialHashtags.map((tag) => createLink(
      `#${tag} ↗`,
      socialSearchUrls[platform](tag),
    )));

    const query = socialQuery.value.trim();
    if (query) {
      const searchUrl = platform === "twitch"
        ? `https://www.twitch.tv/search?term=${encodeURIComponent(query.replace(/^#+/, ""))}`
        : platform === "instagram"
          ? socialSearchUrls.instagram(query.replace(/^#+/, "").split(/\s+/)[0])
          : socialSearchUrls[platform](query.replace(/^#+/, ""));
      container.append(createLink(`Recherche : ${query} ↗`, searchUrl));
    }
  });
}

updateSocialSearchLinks();
let socialSearchTimer;
socialQuery.addEventListener("input", () => {
  updateSocialSearchLinks();
  window.clearTimeout(socialSearchTimer);
  socialSearchTimer = window.setTimeout(() => {
    loadSocial(socialQuery.value.trim() || "manifestation France");
  }, 600);
});

document.querySelectorAll(".load-stream").forEach((button) => {
  button.addEventListener("click", () => {
    const channel = LIVE_CHANNELS[button.dataset.channel];
    const card = button.closest(".live-stream-card");
    const poster = card.querySelector(".stream-poster");
    if (!channel?.id || poster.querySelector("iframe")) return;

    const player = document.createElement("iframe");
    player.className = "stream-player";
    player.title = `Direct ${channel.name} sur YouTube`;
    player.src = `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channel.id)}&autoplay=1&mute=1`;
    player.allow = "autoplay; encrypted-media; picture-in-picture; web-share";
    player.allowFullscreen = true;
    player.loading = "lazy";
    player.referrerPolicy = "strict-origin-when-cross-origin";
    poster.replaceChildren(player);
    button.textContent = "Lecteur intégré";
    button.disabled = true;
  });
});

document.querySelectorAll(".stream-open").forEach((link) => {
  link.href = LIVE_CHANNELS[link.dataset.channel]?.liveUrl || "#";
});

const socialEmbedInput = document.querySelector("#social-post-url");
const socialEmbedStatus = document.querySelector("#social-embed-status");
document.querySelector("#add-social-post").addEventListener("click", () => {
  const embed = createSocialEmbed(socialEmbedInput.value.trim());
  if (!embed) {
    socialEmbedStatus.textContent = "Lien non reconnu. Colle une publication Instagram/Facebook, une vidéo TikTok ou un lien public Twitch.";
    socialEmbedStatus.classList.add("error");
    return;
  }
  socialEmbedStatus.textContent = `Lecteur officiel ${embed.platform} ajouté. S’il est bloqué par la plateforme, ouvre le lien source.`;
  socialEmbedStatus.classList.remove("error");
  const card = document.createElement("article");
  card.className = `social-embed-card social-embed-${embed.platform.toLowerCase()}`;
  const frame = document.createElement("iframe");
  frame.title = `Aperçu ${embed.platform}`;
  frame.src = embed.src;
  frame.loading = "lazy";
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.allow = "autoplay; encrypted-media; picture-in-picture; web-share";
  frame.allowFullscreen = true;
  const source = document.createElement("a");
  source.href = embed.href;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  source.textContent = `Ouvrir sur ${embed.platform} ↗`;
  card.append(frame, source);
  document.querySelector("#social-embed-feed").prepend(card);
  socialEmbedInput.value = "";
});

function createSocialEmbed(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (hostname === "tiktok.com") {
    const match = url.pathname.match(/^\/@[\w.-]+\/video\/(\d+)/);
    return match ? { platform: "TikTok", href: url.href, src: `https://www.tiktok.com/embed/v2/${match[1]}` } : null;
  }
  if (hostname === "instagram.com") {
    const match = url.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    return match ? { platform: "Instagram", href: url.href, src: `https://www.instagram.com/${match[1]}/${match[2]}/embed/` } : null;
  }
  if ((hostname === "facebook.com" || hostname.endsWith(".facebook.com")) && /\/(?:.*\/posts\/|watch\/|videos\/|reel\/|share\/)/i.test(url.pathname)) {
    return { platform: "Facebook", href: url.href, src: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(url.href)}&show_text=true&width=500` };
  }
  const twitchParent = `parent=${encodeURIComponent(window.location.hostname)}`;
  if (hostname === "clips.twitch.tv") {
    const match = url.pathname.match(/^\/([a-zA-Z0-9_-]+)\/?$/);
    return match ? { platform: "Twitch", href: url.href, src: `https://clips.twitch.tv/embed?clip=${encodeURIComponent(match[1])}&${twitchParent}` } : null;
  }
  if (hostname === "twitch.tv") {
    const clip = url.pathname.match(/^\/[a-zA-Z0-9_]+\/clip\/([a-zA-Z0-9_-]+)/);
    if (clip) return { platform: "Twitch", href: url.href, src: `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip[1])}&${twitchParent}` };
    const video = url.pathname.match(/^\/videos\/(\d+)/);
    if (video) return { platform: "Twitch", href: url.href, src: `https://player.twitch.tv/?video=v${video[1]}&${twitchParent}` };
    const channel = url.pathname.match(/^\/([a-zA-Z0-9_]+)\/?$/);
    return channel ? { platform: "Twitch", href: url.href, src: `https://player.twitch.tv/?channel=${encodeURIComponent(channel[1])}&${twitchParent}&muted=true` } : null;
  }
  return null;
}

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

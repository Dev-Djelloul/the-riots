import { createGeographyIndex, createSpectrumPalette, locateArticle } from "./geography.js";
import { combineEuropeBoundaries, EUROPE_COUNTRIES } from "./europe-countries.js";

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

const COUNTRY_NAMES = Object.fromEntries(EUROPE_COUNTRIES.map(({ code, name }) => [code, name]));
const COUNTRY_CODES = EUROPE_COUNTRIES.map(({ code }) => code);
const COUNTRY_BOUNDARY_CODES = new Set(["BE", "DE", "ES", "FR", "IT"]);
const EUROPE_BOUNDARIES_URL = "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";
function isValidDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const PUBLISHER_MARKS = {
  franceinfo: { label: "fi", color: "#f2a900" },
  bfmtv: { label: "BF", color: "#0783c6" },
  cnews: { label: "CN", color: "#c5222a" },
  "le-monde": { label: "LM", color: "#244c83" },
  "france-24": { label: "F24", color: "#174c99" },
  rfi: { label: "RFI", color: "#f27a21" },
  "le-figaro": { label: "FIG", color: "#23557d" },
  liberation: { label: "LIB", color: "#e3312d" },
  "ouest-france": { label: "OF", color: "#17609a" },
  "sud-ouest": { label: "SO", color: "#d62e3c" },
  "20-minutes": { label: "20", color: "#f4b21b" },
  "la-croix": { label: "LC", color: "#b41e34" },
  humanite: { label: "H", color: "#c92734" },
  "la-depeche": { label: "DD", color: "#17639c" },
  "le-parisien": { label: "LP", color: "#1677a8" },
  "france-inter": { label: "FI", color: "#b81238" },
  lexpress: { label: "LX", color: "#141414" },
  challenges: { label: "CH", color: "#bd252d" },
  vrt: { label: "VRT", color: "#f15a24" },
  rtbf: { label: "RTBF", color: "#c61932" },
  elpais: { label: "EP", color: "#1d2635" },
  eldiario: { label: "ED", color: "#df3c31" },
  rainews: { label: "RAI", color: "#2876c4" },
  repubblica: { label: "REP", color: "#c91e28" },
  tagesschau: { label: "TS", color: "#1a5291" },
  "dw-de": { label: "DW", color: "#17618c" },
};
const STORAGE_KEYS = {
  savedArticles: "veille-saved-articles-v1",
  alertRules: "veille-alert-rules-v1",
  seenArticles: "veille-seen-articles-v1",
  customFeeds: "veille-custom-feeds-v1",
};
const PERIODS = ["all", "today", "week"];
const ARTICLE_TYPES = ["all", "rassemblement", "tensions", "degradations"];
const validCountries = ["all", ...COUNTRY_CODES];
const COUNTRY_TREND_COLORS = createSpectrumPalette(COUNTRY_CODES);

function createCountryLabel(code, className = "") {
  const label = document.createElement("span");
  label.className = `country-label${className ? ` ${className}` : ""}`;
  const flag = createCountryFlag(code);
  if (flag) label.append(flag);
  const name = document.createElement("span");
  name.textContent = COUNTRY_NAMES[code] || "Europe";
  label.append(name);
  return label;
}

function createCountryFlag(code) {
  if (!/^[A-Z]{2}$/.test(code || "")) return null;
  const flag = document.createElement("span");
  flag.className = "country-flag";
  flag.setAttribute("aria-hidden", "true");
  flag.textContent = String.fromCodePoint(...code.split("").map((letter) => 127397 + letter.charCodeAt(0)));
  return flag;
}

function populateCountrySelectors() {
  const countries = [...EUROPE_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  for (const selector of ["#country-filter", "#alert-country", "#custom-feed-country"]) {
    const select = document.querySelector(selector);
    if (!select) continue;
    const existing = new Set([...select.options].map((option) => option.value));
    for (const country of countries) {
      if (existing.has(country.code)) continue;
      const option = document.createElement("option");
      option.value = country.code;
      option.textContent = `${createCountryFlag(country.code)?.textContent || ""} ${country.name}`;
      select.append(option);
    }
  }
}

populateCountrySelectors();

function createPublisherMark(sourceId, sourceName, className = "") {
  const mark = document.createElement("span");
  const identity = PUBLISHER_MARKS[sourceId];
  const words = (sourceName || "Média")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  mark.className = `publisher-mark${className ? ` ${className}` : ""}`;
  mark.textContent = identity?.label.toLocaleUpperCase("fr")
    || words.slice(0, 2).map((word) => [...word][0]).join("").toLocaleUpperCase("fr");
  mark.style.setProperty("--publisher-color", identity?.color || "#626b73");
  mark.setAttribute("aria-hidden", "true");
  if (identity && /^[a-z0-9-]+$/.test(sourceId)) {
    const logo = document.createElement("img");
    logo.alt = "";
    logo.loading = "lazy";
    logo.decoding = "async";
    logo.addEventListener("load", () => {
      mark.classList.add("has-logo");
      mark.replaceChildren(logo);
    }, { once: true });
    logo.addEventListener("error", () => logo.remove(), { once: true });
    mark.append(logo);
    logo.src = `/icons/press/${sourceId}.png`;
  }
  return mark;
}

function readSharedView() {
  const params = new URLSearchParams(window.location.search);
  return {
    query: (params.get("q") || "").slice(0, 120).trim().toLocaleLowerCase("fr"),
    period: PERIODS.includes(params.get("period")) ? params.get("period") : "all",
    selectedDate: isValidDateOnly(params.get("date")) ? params.get("date") : "",
    type: ARTICLE_TYPES.includes(params.get("type")) ? params.get("type") : "all",
    mapMode: ["france", "europe"].includes(params.get("view")) ? params.get("view") : "france",
    country: validCountries.includes(params.get("country")) ? params.get("country") : "all",
  };
}

function isPublicFeedUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && !url.username && !url.password && !url.port
      && url.hostname.replace(/\.$/, "") !== "localhost"
      && !url.hostname.endsWith(".localhost")
      && url.hostname.includes(".")
      && !/\.(?:local|internal|test|invalid)$/i.test(url.hostname)
      && !/^\d+(?:\.\d+){3}$/.test(url.hostname)
      && !url.hostname.includes(":")
      && url.href.length <= 2048;
  } catch {
    return false;
  }
}

function readStoredValue(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    console.warn(`Impossible de lire la préférence locale « ${key} ».`, error);
    return fallback;
  }
}

function writeStoredValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Impossible d’enregistrer la préférence locale « ${key} ».`, error);
    return false;
  }
}

function isValidSavedArticle(article) {
  if (!article || typeof article !== "object"
    || typeof article.id !== "string"
    || typeof article.title !== "string"
    || typeof article.publishedAt !== "string"
    || typeof article.sourceName !== "string"
    || !Array.isArray(article.matchedTerms)
    || !Array.isArray(article.location?.places || [])) return false;
  try {
    return new URL(article.link).protocol === "https:";
  } catch {
    return false;
  }
}

const storedSavedArticles = readStoredValue(STORAGE_KEYS.savedArticles, []);
const savedArticles = new Map(
  (Array.isArray(storedSavedArticles) ? storedSavedArticles : [])
    .filter(isValidSavedArticle)
    .map((article) => [article.id, article]),
);
const storedAlertRules = readStoredValue(STORAGE_KEYS.alertRules, []);
const alertRules = Array.isArray(storedAlertRules)
  ? storedAlertRules.filter((rule) => rule && typeof rule.id === "string"
    && typeof rule.query === "string" && typeof rule.countryCode === "string"
    && (rule.query.trim() || COUNTRY_CODES.includes(rule.countryCode))
    && (!rule.countryCode || COUNTRY_CODES.includes(rule.countryCode)))
  : [];
const storedSeenArticles = readStoredValue(STORAGE_KEYS.seenArticles, null);
const storedCustomFeeds = readStoredValue(STORAGE_KEYS.customFeeds, []);
const customFeeds = Array.isArray(storedCustomFeeds)
  ? storedCustomFeeds.filter((feed) => feed && typeof feed.id === "string"
    && /^[a-z0-9-]{1,40}$/.test(feed.id)
    && typeof feed.name === "string" && feed.name.trim().length > 0 && feed.name.trim().length <= 60
    && typeof feed.feed === "string" && isPublicFeedUrl(feed.feed)
    && typeof feed.countryCode === "string"
    && (!feed.countryCode || COUNTRY_CODES.includes(feed.countryCode)))
  : [];

const LIVE_CHANNELS = {
  dwnews: {
    id: "UCknLrEdhRCp1aegoMqRaCZg",
    name: "DW News",
    liveUrl: "https://www.youtube.com/@dwnews/live",
  },
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
  france24: {
    name: "France 24",
    embedUrl: "https://embed.france24.com/fr/live",
    liveUrl: "https://f24.my/YTliveFR",
    siteUrl: "https://www.france24.com/fr/direct",
  },
  lci: {
    name: "LCI",
    id: "UCewhc0fvja891XkpIPGRMxQ",
    liveUrl: "https://www.youtube.com/@LCI/live",
    siteUrl: "https://www.tf1info.fr/direct/",
  },
  euronews: {
    name: "Euronews",
    id: "UCW2QcKZiU8aUGg4yxCIditg",
    liveUrl: "https://www.youtube.com/@euronewsfr/live",
    siteUrl: "https://fr.euronews.com/live",
  },
  tv5monde: {
    name: "TV5MONDE Info",
    id: "UCzKH70qfN_yuXq3s91fdwmg",
    liveUrl: "https://www.youtube.com/@TV5MONDEInfo/live",
    siteUrl: "https://europe.tv5monde.com/fr/direct",
  },
  cnews: {
    name: "CNEWS",
    id: "UCXKJrYczY2_fJEZgFPGY0HQ",
    liveUrl: "https://www.youtube.com/@CNEWSofficiel/live",
    siteUrl: "https://www.cnews.fr/le-direct",
  },
  rtve: {
    id: "UC7QZIf0dta-XPXsp9Hv4dTw",
    name: "RTVE Noticias · Canal 24h",
    liveUrl: "https://www.youtube.com/@rtvenoticias/live",
    siteUrl: "https://www.rtve.es/play/videos/directo/24h/",
  },
};

const state = {
  articles: [],
  sources: [],
  ...readSharedView(),
  selected: null,
  newestFirst: true,
  groupBy: "default",
  calendarMonth: "",
  fetchedAt: null,
  showSaved: false,
  seenArticleIds: new Set(Array.isArray(storedSeenArticles)
    ? storedSeenArticles.filter((id) => typeof id === "string")
    : []),
  seenArticlesInitialized: Array.isArray(storedSeenArticles),
};

function toDateKey(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function renderDayCalendar() {
  const container = document.querySelector("#day-calendar");
  if (!container) return;
  if (!state.calendarMonth) state.calendarMonth = toDateKey(new Date()).slice(0, 7);
  const [year, month] = state.calendarMonth.split("-").map(Number);
  const counts = new Map();
  for (const article of state.articles) {
    const time = Date.parse(article.publishedAt);
    if (!Number.isFinite(time)) continue;
    const key = toDateKey(new Date(time));
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const max = Math.max(1, ...counts.values());
  const todayKey = toDateKey(new Date());
  const title = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  const offset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();

  const head = document.createElement("div");
  head.className = "cal-head";
  const prev = document.createElement("button");
  prev.type = "button";
  prev.dataset.calNav = "-1";
  prev.setAttribute("aria-label", "Mois précédent");
  prev.textContent = "‹";
  const next = document.createElement("button");
  next.type = "button";
  next.dataset.calNav = "1";
  next.setAttribute("aria-label", "Mois suivant");
  next.textContent = "›";
  const label = document.createElement("strong");
  label.textContent = title;
  head.append(prev, label, next);

  const grid = document.createElement("div");
  grid.className = "cal-grid";
  for (const name of ["L", "M", "M", "J", "V", "S", "D"]) {
    const cell = document.createElement("span");
    cell.className = "cal-dow";
    cell.textContent = name;
    grid.append(cell);
  }
  for (let i = 0; i < offset; i += 1) grid.append(document.createElement("span"));
  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = `${state.calendarMonth}-${String(day).padStart(2, "0")}`;
    const count = counts.get(key) || 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cal-day";
    button.dataset.calDay = key;
    button.style.setProperty("--heat", count ? (0.18 + 0.62 * count / max).toFixed(2) : "0");
    button.classList.toggle("has-articles", count > 0);
    button.classList.toggle("today", key === todayKey);
    button.classList.toggle("selected", key === state.selectedDate);
    button.setAttribute("aria-pressed", String(key === state.selectedDate));
    button.setAttribute("aria-label", `${day} ${title} : ${count} article${count > 1 ? "s" : ""}`);
    button.title = `${count} article${count > 1 ? "s" : ""}`;
    button.textContent = String(day);
    grid.append(button);
  }
  container.replaceChildren(head, grid);
}

function setSelectedDate(date) {
  state.selectedDate = isValidDateOnly(date) ? date : "";
  state.period = state.selectedDate ? "all" : state.period;
  if (state.selectedDate) state.calendarMonth = state.selectedDate.slice(0, 7);
  syncSharedViewControls();
  updateShareUrl();
  render();
  if (state.selectedDate) loadArchiveDay(state.selectedDate);
  else renderArchiveStatus();
}

function updateShareUrl() {
  const url = new URL(window.location.href);
  for (const key of ["q", "period", "date", "type", "view", "country"]) url.searchParams.delete(key);
  if (state.query) url.searchParams.set("q", state.query);
  if (state.selectedDate) url.searchParams.set("date", state.selectedDate);
  else if (state.period !== "all") url.searchParams.set("period", state.period);
  if (state.type !== "all") url.searchParams.set("type", state.type);
  if (state.mapMode !== "france") url.searchParams.set("view", state.mapMode);
  if (state.country !== "all") url.searchParams.set("country", state.country);
  window.history.replaceState(null, "", url);
}

function syncSharedViewControls() {
  document.querySelector("#search-input").value = state.query;
  document.querySelectorAll("[data-period]").forEach((button) => {
    button.classList.toggle("active", !state.selectedDate && button.dataset.period === state.period);
  });
  if (state.selectedDate) state.calendarMonth = state.selectedDate.slice(0, 7);
  renderDayCalendar();
  document.querySelectorAll("[data-type]").forEach((button) => {
    button.classList.toggle("active", button.dataset.type === state.type);
  });
  document.querySelectorAll("[data-map-mode]").forEach((button) => {
    const active = button.dataset.mapMode === state.mapMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelector("#country-filter").value = state.country;
}

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
const franceLayer = map ? L.layerGroup().addTo(map) : null;
const europeLayer = map ? L.layerGroup() : null;
const europeMarkerLayer = map ? L.layerGroup() : null;
const departmentLayers = new Map();
const countryLayers = new Map();
let departmentArticlesByCode = new Map();
let departmentColors = new Map();
let countryArticlesByCode = new Map();
let countryColors = new Map();
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
    const [communesResponse, departmentsResponse, europeResponse] = await Promise.all([
      fetch("/data/communes.json"),
      fetch("/data/departements.geojson"),
      fetch("/data/europe-countries.geojson"),
    ]);
    if (!communesResponse.ok || !departmentsResponse.ok) {
      throw new Error(`Données géographiques indisponibles (${communesResponse.status}/${departmentsResponse.status}/${europeResponse.status})`);
    }
    const [communes, departments] = await Promise.all([
      communesResponse.json(),
      departmentsResponse.json(),
    ]);
    if (!Array.isArray(communes) || departments.features?.length !== 96) {
      throw new Error("Le jeu de données ne contient pas les 96 départements métropolitains attendus.");
    }
    const localEurope = europeResponse.ok ? await europeResponse.json() : null;
    let worldFeatures = [];
    try {
      const worldResponse = await fetch(EUROPE_BOUNDARIES_URL);
      if (!worldResponse.ok) throw new Error(`GeoJSON mondial indisponible (${worldResponse.status})`);
      const world = await worldResponse.json();
      if (!Array.isArray(world?.features)) throw new Error("Format GeoJSON mondial invalide");
      worldFeatures = world.features;
    } catch (error) {
      console.warn("Impossible de charger les contours européens complets ; les données locales restent disponibles.", error);
    }
    const europeFeatures = combineEuropeBoundaries(localEurope?.features, worldFeatures);
    const hasEuropeBoundaries = europeFeatures.length > 0;
    if (europeFeatures.length < COUNTRY_CODES.length) {
      mapDataWarning.hidden = false;
      mapDataWarning.textContent = `Contours Europe partiels · ${europeFeatures.length}/${COUNTRY_CODES.length} pays · repères approximatifs pour les autres`;
    } else {
      mapDataWarning.hidden = true;
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
    }).addTo(franceLayer);
    if (hasEuropeBoundaries) {
      L.geoJSON({ type: "FeatureCollection", features: europeFeatures }, {
        style: countryStyle,
        onEachFeature(feature, layer) {
          const code = feature.properties.countryCode;
          countryLayers.set(code, layer);
          layer.bindPopup(createLocationPopup(COUNTRY_NAMES[code], [], "country", code));
          layer.on("click", () => {
            const group = countryArticlesByCode.get(code);
            layer.setPopupContent(createLocationPopup(COUNTRY_NAMES[code], group?.articles || [], "country", code));
          });
        },
      }).addTo(europeLayer);
    }
    map.fitBounds(departmentLayers.size ? L.featureGroup([...departmentLayers.values()]).getBounds().pad(0.04) : [[41.2, -5.5], [51.3, 9.8]]);
    document.querySelector("#map-mode-controls").hidden = !hasEuropeBoundaries;
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

function countryStyle(feature) {
  const code = feature.properties.countryCode;
  const count = countryArticlesByCode.get(code)?.articles.length || 0;
  const color = countryColors.get(code);
  return {
    color: color || "#73766e",
    weight: count ? 2 : 1,
    opacity: 0.9,
    fillColor: color || "#777a70",
    fillOpacity: count ? 0.32 : 0.06,
  };
}

function enrichArticle(article, geography) {
  let location = geography ? locateArticle(article, geography) : { precision: "unknown", places: [] };
  if (article.countryCode && article.countryCode !== "FR") {
    location = article.city && article.position
      ? { precision: "city", places: [{ name: article.city, precision: "city", coordinates: article.position }] }
      : { precision: "country", places: [] };
  }
  return {
    ...article,
    countryCode: article.countryCode || (location.places.length ? "FR" : null),
    location,
  };
}

const archiveDays = new Map();

async function loadArchiveDay(date) {
  const key = `${date}:${state.country}`;
  if (archiveDays.has(key) && archiveDays.get(key).status !== "error") return;
  archiveDays.set(key, { status: "loading", articles: [] });
  renderArchiveStatus();
  try {
    const [response, geography] = await Promise.all([
      fetch(`/api/archive?date=${encodeURIComponent(date)}${state.country === "all" ? "" : `&country=${encodeURIComponent(state.country)}`}`, { headers: { Accept: "application/json" } }),
      geographyPromise,
    ]);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Réponse inattendue (${response.status})`);
    archiveDays.set(key, {
      status: "ready",
      articles: (payload.articles || []).map((article) => enrichArticle(article, geography)),
    });
  } catch (error) {
    console.error("Archive indisponible.", error);
    archiveDays.set(key, { status: "error", articles: [] });
  }
  if (state.selectedDate === date) render();
  else renderArchiveStatus();
}

function renderArchiveStatus() {
  const note = document.querySelector("#archive-status");
  if (!note) return;
  const entry = state.selectedDate ? archiveDays.get(`${state.selectedDate}:${state.country}`) : null;
  note.hidden = !entry;
  note.textContent = !entry ? ""
    : entry.status === "loading" ? "Recherche des articles archivés de ce jour…"
      : entry.status === "error" ? "Impossible de joindre les archives pour ce jour. Réessaie plus tard ; les résultats dépendent des sources indexées."
        : `${entry.articles.length} article${entry.articles.length > 1 ? "s" : ""} archivé${entry.articles.length > 1 ? "s" : ""} pour ce jour.`;
}

function getVisibleArticles({ ignoreCountry = false, fromSaved = false } = {}) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  let sourceArticles = fromSaved ? [...savedArticles.values()] : state.articles;
  if (!fromSaved && state.selectedDate) {
    const known = new Set(sourceArticles.map((article) => article.link));
    const archived = (archiveDays.get(`${state.selectedDate}:${state.country}`)?.articles || []).filter((article) => !known.has(article.link));
    sourceArticles = [...sourceArticles, ...archived];
  }
  return sourceArticles
    .filter((article) => {
      if (fromSaved) return true;
      if (state.selectedDate) {
        const publishedAt = Date.parse(article.publishedAt);
        if (!Number.isFinite(publishedAt)) return false;
        const selectedStart = new Date(`${state.selectedDate}T00:00:00`).getTime();
        const selectedEnd = new Date(`${state.selectedDate}T00:00:00`);
        selectedEnd.setDate(selectedEnd.getDate() + 1);
        return publishedAt >= selectedStart && publishedAt < selectedEnd.getTime();
      }
      if (state.period === "all") return true;
      const publishedAt = Date.parse(article.publishedAt);
      if (!Number.isFinite(publishedAt) || publishedAt > now.getTime()) return false;
      if (state.period === "today") return publishedAt >= startOfToday && publishedAt < startOfTomorrow;
      if (state.period === "week") return publishedAt >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return false;
    })
    .filter((article) => fromSaved || state.type === "all" || article.type === state.type)
    .filter((article) => fromSaved || ignoreCountry || state.mapMode !== "europe"
      || (article.countryCode && (state.country === "all" || article.countryCode === state.country)))
    .filter((article) => {
      if (fromSaved) return true;
      const placeNames = article.location?.places.map((place) => place.name).join(" ") || article.location?.label || "";
      const searchable = `${article.title} ${article.description} ${placeNames} ${article.sourceName} ${(article.matchedTerms || []).join(" ")}`.toLocaleLowerCase("fr");
      return searchable.includes(state.query);
    })
    .sort((a, b) => {
      const delta = Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
      return state.newestFirst ? delta : -delta;
    });
}

function render() {
  const articles = getVisibleArticles();
  const feedArticles = state.showSaved ? getVisibleArticles({ fromSaved: true }) : articles;
  const groupMode = getGroupMode();
  if (groupMode === "timeline") {
    const cards = feedArticles.map(createArticleCard);
    if (cards.length) cards.push(createFeedJumpButton());
    feed.replaceChildren(...cards);
  }
  else renderGroupedFeed(feedArticles, groupMode);
  renderVisuals(articles);
  renderCoverageComparison(getVisibleArticles({ ignoreCountry: true }));
  renderTrends();
  const mapped = articles.filter((article) => article.countryCode && (state.mapMode === "france"
    ? article.countryCode === "FR" && article.location?.places.length
    : true));
  const mapStats = renderMap(articles);
  mapEmpty.hidden = Boolean(map) && mapped.length > 0;
  mapEmpty.innerHTML = state.mapMode === "europe"
    ? "Aucun article géolocalisé dans les pays sélectionnés.<br /><span>Les contours et repères situent les lieux mentionnés dans les articles des médias suivis.</span>"
    : geographyIndex
      ? "Aucun lieu suffisamment précis cité dans les titres ou extraits.<br /><span>Les limites des 96 départements restent visibles ; les couleurs distinguent les départements cités dans les articles.</span>"
      : "Données géographiques indisponibles.<br /><span>Les articles restent consultables ; réessaie après actualisation.</span>";
  const isEmpty = feedArticles.length === 0;
  emptyState.hidden = !isEmpty;
  feed.hidden = isEmpty;
  document.querySelector("#empty-title").textContent = state.showSaved
    ? "Aucun article enregistré"
    : state.articles.length === 0 ? "Aucun article disponible" : "Aucun résultat";
  document.querySelector("#empty-message").textContent = state.showSaved
    ? "Enregistre un article avec le bouton « À lire plus tard » pour le retrouver ici."
    : state.articles.length === 0
      ? "Les flux n’ont retourné aucun article correspondant. Vérifie les sources ou réessaie plus tard."
      : "Essaie une autre recherche ou modifie les filtres.";
  document.querySelector("#reset-filters").hidden = state.articles.length === 0 || state.showSaved;
  document.querySelector("#feed-count").textContent = String(feedArticles.length).padStart(2, "0");
  const savedFilter = document.querySelector("#saved-filter");
  savedFilter.classList.toggle("active", state.showSaved);
  savedFilter.setAttribute("aria-pressed", String(state.showSaved));
  document.querySelector("#saved-count").textContent = String(savedArticles.size);
  document.querySelector("#map-result-count").textContent = state.mapMode === "europe"
    ? `${mapStats.countryCount} PAYS · ${mapStats.cityCount} VILLE${mapStats.cityCount === 1 ? "" : "S"} · ${mapped.length} ARTICLE${mapped.length === 1 ? "" : "S"} LOCALISÉ${mapped.length === 1 ? "" : "S"}`
    : `${mapStats.communeCount} COMMUNE${mapStats.communeCount === 1 ? "" : "S"} · ${mapStats.departmentCount} DÉPARTEMENT${mapStats.departmentCount === 1 ? "" : "S"} · ${mapped.length} ARTICLE${mapped.length === 1 ? "" : "S"} LOCALISÉ${mapped.length === 1 ? "" : "S"}`;
  const modeArticleCount = state.articles.filter((article) => state.mapMode !== "europe"
    || (article.countryCode && (state.country === "all" || article.countryCode === state.country))).length;
  document.querySelector("#count-all").textContent = String(modeArticleCount).padStart(2, "0");
  renderDayCalendar();
  renderArchiveStatus();
  document.querySelector("#today-label").textContent = state.mapMode === "europe" ? "ÉDITION EUROPE" : "ÉDITION FRANCE";
  document.querySelector("#map-title").textContent = state.mapMode === "europe" ? `Europe · ${EUROPE_COUNTRIES.length} pays suivis` : "France métropolitaine";
  mapElement.setAttribute("aria-label", state.mapMode === "europe"
    ? `Carte de ${EUROPE_COUNTRIES.length} pays européens suivis ; contours et repères situent les mentions d’articles.`
    : "Carte interactive des départements métropolitains colorés selon les lieux cités dans les articles");
  document.querySelector("#map-date").textContent = state.mapMode === "europe" ? `${EUROPE_COUNTRIES.length} PAYS · MENTIONS D’ARTICLES` : "96 DÉPARTEMENTS · MENTIONS D’ARTICLES";
  document.querySelector("#map-legend").textContent = state.mapMode === "europe"
    ? "Contours · repères de villes cités dans les articles"
    : "Départements colorés · repères communaux cliquables";
  document.querySelector("#map-footer-note").textContent = state.mapMode === "europe"
    ? "COUVERTURE MÉDIATIQUE · TITRES ET EXTRAITS DANS LA LANGUE DU MÉDIA · PAS UN DÉCOMPTE D’ÉVÉNEMENTS"
    : "COUVERTURE MÉDIATIQUE · COULEURS DISTINCTES, SANS CLASSEMENT D’INTENSITÉ · PAS UN DÉCOMPTE D’ÉVÉNEMENTS";
  document.querySelector("#map-data-credit").hidden = state.mapMode === "europe";
  document.querySelector("#map-filter-controls").hidden = state.mapMode !== "europe";
  document.querySelector("#map-legend-spectrum").hidden = state.mapMode === "europe";
  document.querySelector("#feed-heading-label").textContent = state.mapMode === "europe" ? "CHRONOLOGIE DE COUVERTURE" : "LE FIL";
  document.querySelector("#feed-heading-title").textContent = state.mapMode === "europe" ? "Échos médiatiques" : "Articles récents";
  document.querySelector("#timeline-note").hidden = state.mapMode !== "europe";
  document.querySelectorAll("[data-map-mode]").forEach((button) => {
    const active = button.dataset.mapMode === state.mapMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderSources();
}

const REGION_DEPARTMENTS = {
  "Île-de-France": ["75", "77", "78", "91", "92", "93", "94", "95"],
  "Auvergne-Rhône-Alpes": ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"],
  "Bourgogne-Franche-Comté": ["21", "25", "39", "58", "70", "71", "89", "90"],
  "Bretagne": ["22", "29", "35", "56"],
  "Centre-Val de Loire": ["18", "28", "36", "37", "41", "45"],
  "Corse": ["2A", "2B", "20"],
  "Grand Est": ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"],
  "Hauts-de-France": ["02", "59", "60", "62", "80"],
  "Normandie": ["14", "27", "50", "61", "76"],
  "Nouvelle-Aquitaine": ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"],
  "Occitanie": ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"],
  "Pays de la Loire": ["44", "49", "53", "72", "85"],
  "Provence-Alpes-Côte d’Azur": ["04", "05", "06", "13", "83", "84"],
};
const REGION_BY_DEPARTMENT = Object.fromEntries(
  Object.entries(REGION_DEPARTMENTS).flatMap(([region, codes]) => codes.map((code) => [code, region])),
);
const GROUP_MODES = ["default", "event", "place", "region", "media", "timeline"];
const MEDIA_CATEGORIES = ["Presse nationale", "Presse régionale", "Audiovisuel et chaînes d’info", "Média international", "Autre média"];

function getMediaCategory(sourceId) {
  const kind = state.sources.find((source) => source.id === sourceId)?.kind || "";
  if (/régionale/i.test(kind)) return "Presse régionale";
  if (/audiovisuel|public|chaîne/i.test(kind)) return "Audiovisuel et chaînes d’info";
  if (/international/i.test(kind)) return "Média international";
  if (/presse/i.test(kind)) return "Presse nationale";
  return "Autre média";
}

function getArticleRegion(article) {
  if (article.countryCode && article.countryCode !== "FR") {
    return article.region || COUNTRY_NAMES[article.countryCode] || "Europe";
  }
  const place = article.location?.places?.[0];
  const departmentCode = place?.departmentCode ? String(place.departmentCode) : "";
  return REGION_BY_DEPARTMENT[departmentCode] || article.region || (article.countryCode === "FR" ? "France · région non précisée" : "Non localisé");
}

function getGroupMode() {
  const mode = state.groupBy || "default";
  if (mode !== "default") return mode;
  return state.mapMode === "europe" ? "event" : "timeline";
}

function describeGroup(article, mode) {
  const date = new Date(article.publishedAt).toISOString().slice(0, 10);
  const place = article.location?.places?.[0]?.name || "";
  const countryName = COUNTRY_NAMES[article.countryCode] || "";
  if (mode === "media") {
    const category = getMediaCategory(article.sourceId);
    return { key: category, title: category, rank: MEDIA_CATEGORIES.indexOf(category) };
  }
  if (mode === "region") {
    const region = getArticleRegion(article);
    return { key: `${article.countryCode}|${region}`, title: region, countryCode: article.countryCode };
  }
  if (mode === "place") {
    return place
      ? { key: `${article.countryCode}|${normalizePlace(place)}`, title: place, subtitle: getArticleRegion(article), countryCode: article.countryCode }
      : { key: "none", title: "Lieu non identifié", countryCode: null, last: true };
  }
  return place
    ? { key: [date, article.countryCode, normalizePlace(place), article.type].join("|"), title: place, subtitle: countryName, countryCode: article.countryCode, date, type: article.type }
    : { key: article.id, title: "Lieu non identifié", subtitle: countryName, countryCode: article.countryCode, date, type: article.type };
}

function createCoverageChips(articles, mode) {
  const chips = document.createElement("div");
  chips.className = "coverage-chips";
  const counts = new Map();
  for (const article of articles) {
    const label = mode === "media" ? getArticleRegion(article) : getMediaCategory(article.sourceId);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  for (const [label, count] of [...counts].sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    const chip = document.createElement("span");
    chip.className = "coverage-chip";
    chip.textContent = `${label} · ${count}`;
    chips.append(chip);
  }
  const outlets = new Map(articles.map((article) => [article.sourceId, article.sourceName]));
  const marks = document.createElement("span");
  marks.className = "coverage-outlets";
  for (const [id, name] of outlets) {
    const mark = createPublisherMark(id, name, "publisher-mark-small");
    mark.title = name;
    marks.append(mark);
  }
  chips.append(marks);
  return chips;
}

function createFeedJumpButton() {
  const button = document.createElement("button");
  button.className = "feed-jump-top";
  button.id = "feed-jump-top";
  button.type = "button";
  button.setAttribute("aria-label", "Revenir au premier article du fil");
  button.textContent = "↑ Retour au premier article";
  button.addEventListener("click", () => {
    feed.scrollTo({
      top: 0,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  });
  return button;
}

function renderGroupedFeed(articles, mode) {
  const groups = new Map();
  for (const article of articles) {
    const descriptor = describeGroup(article, mode);
    const group = groups.get(descriptor.key) || { ...descriptor, articles: [] };
    group.articles.push(article);
    groups.set(descriptor.key, group);
  }

  const ordered = [...groups.values()];
  if (mode !== "event") {
    ordered.sort((a, b) => Number(a.last || false) - Number(b.last || false)
      || (mode === "media" ? a.rank - b.rank : b.articles.length - a.articles.length));
  }

  const sections = ordered.map((group) => {
    const section = document.createElement("section");
    section.className = "coverage-group";
    if (group.type) section.dataset.type = COLORS[group.type] ? group.type : "autre";
    const heading = document.createElement("div");
    heading.className = "coverage-group-heading";
    const outlets = new Set(group.articles.map((article) => article.sourceId)).size;
    const title = document.createElement("strong");
    const flag = createCountryFlag(group.countryCode);
    title.append(...(flag ? [flag] : []), document.createTextNode(group.title));
    if (group.subtitle) {
      const subtitle = document.createElement("span");
      subtitle.className = "coverage-group-subtitle";
      subtitle.textContent = group.subtitle;
      title.append(subtitle);
    }
    const stats = document.createElement("span");
    stats.className = "coverage-group-stats";
    stats.textContent = `${group.articles.length} article${group.articles.length === 1 ? "" : "s"} · ${outlets} média${outlets === 1 ? "" : "s"}`;
    const latest = group.date || new Date(group.articles[0].publishedAt).toISOString().slice(0, 10);
    const date = document.createElement("time");
    date.dateTime = latest;
    date.textContent = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(`${latest}T12:00:00Z`));
    heading.append(title, stats, date);

    const note = document.createElement("p");
    note.className = "coverage-summary";
    const coverage = outlets > 1 ? `${outlets} médias suivis couvrent ce sujet.` : "Sujet repéré dans un média suivi.";
    note.textContent = mode === "event"
      ? `Associé à « ${TYPE_LABELS[group.type] || TYPE_LABELS.autre} » par mots-clés. ${coverage}`
      : `Articles regroupés ${mode === "media" ? "par type de média" : mode === "region" ? "par région ou pays" : "par lieu cité"}. ${coverage}`;
    section.append(heading, createCoverageChips(group.articles, mode), note, ...group.articles.map(createArticleCard));
    return section;
  });
  if (sections.length) sections.push(createFeedJumpButton());
  feed.replaceChildren(...sections);
}

function renderCoverageComparison(articles) {
  const panel = document.querySelector("#coverage-compare");
  panel.hidden = state.mapMode !== "europe" || state.showSaved;
  if (panel.hidden) return;

  const totals = new Map(COUNTRY_CODES.map((code) => [code, { articles: 0, outlets: new Set() }]));
  for (const article of articles) {
    if (!article.countryCode || !totals.has(article.countryCode)) continue;
    const total = totals.get(article.countryCode);
    total.articles += 1;
    total.outlets.add(article.sourceId || article.sourceName);
  }
  const maxArticles = Math.max(1, ...[...totals.values()].map((total) => total.articles));
  const list = document.querySelector("#coverage-compare-list");
  list.replaceChildren(...COUNTRY_CODES.map((code) => {
    const total = totals.get(code);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `coverage-country${state.country === code ? " active" : ""}`;
    button.dataset.country = code;
    button.setAttribute("aria-pressed", String(state.country === code));
    const name = createCountryLabel(code, "coverage-country-name");
    const bar = document.createElement("span");
    bar.className = "coverage-bar";
    const fill = document.createElement("span");
    fill.style.width = `${Math.round(total.articles / maxArticles * 100)}%`;
    bar.append(fill);
    const count = document.createElement("span");
    count.className = "coverage-count";
    count.textContent = `${total.articles} art. · ${total.outlets.size} médias`;
    button.append(name, bar, count);
    return button;
  }));
}

function renderTrends() {
  const panel = document.querySelector("#trend-panel");
  panel.hidden = state.mapMode !== "europe" || state.showSaved;
  if (panel.hidden) return;

  const dayCount = Number(document.querySelector("#trend-period").value);
  const selectedType = document.querySelector("#trend-type").value;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const firstDay = new Date(today);
  firstDay.setDate(firstDay.getDate() - dayCount + 1);
  const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const dates = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + index);
    return date;
  });
  const dateIndexes = new Map(dates.map((date, index) => [dateKey(date), index]));
  const buckets = new Map(COUNTRY_CODES.map((code) => [code, dates.map(() => 0)]));
  for (const article of state.articles) {
    if (!buckets.has(article.countryCode) || (selectedType !== "all" && article.type !== selectedType)) continue;
    const publishedAt = new Date(article.publishedAt);
    if (!Number.isFinite(publishedAt.getTime())) continue;
    const index = dateIndexes.get(dateKey(publishedAt));
    if (index !== undefined) buckets.get(article.countryCode)[index] += 1;
  }

  const svg = document.querySelector("#trend-chart");
  const width = 520;
  const height = 130;
  const margin = { top: 8, right: 10, bottom: 22, left: 24 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxValue = Math.max(1, ...[...buckets.values()].flat());
  const makeSvgElement = (name, attributes, text) => {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    if (text) element.textContent = text;
    return element;
  };
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.replaceChildren(
    makeSvgElement("title", { id: "trend-chart-title" }, `Articles par pays sur ${dayCount} jours`),
    makeSvgElement("desc", { id: "trend-chart-desc" }, "Lignes quotidiennes calculées à partir des articles actuellement disponibles dans les flux RSS suivis."),
  );
  svg.setAttribute("aria-labelledby", "trend-chart-title trend-chart-desc");
  for (let tick = 0; tick <= 2; tick += 1) {
    const y = margin.top + plotHeight * tick / 2;
    const value = Math.round(maxValue * (1 - tick / 2));
    svg.append(
      makeSvgElement("line", { class: "trend-gridline", x1: margin.left, x2: width - margin.right, y1: y, y2: y }),
      makeSvgElement("text", { class: "trend-axis-label", x: margin.left - 5, y: y + 3, "text-anchor": "end" }, value),
    );
  }
  const labelIndexes = new Set([0, Math.floor((dayCount - 1) / 2), dayCount - 1]);
  for (const index of labelIndexes) {
    const x = margin.left + plotWidth * index / Math.max(1, dayCount - 1);
    const label = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" }).format(dates[index]);
    svg.append(makeSvgElement("text", {
      class: "trend-axis-label",
      x,
      y: height - 5,
      "text-anchor": index === 0 ? "start" : index === dayCount - 1 ? "end" : "middle",
    }, label));
  }

  const legend = document.querySelector("#trend-legend");
  legend.replaceChildren();
  let hasArticles = false;
  for (const code of COUNTRY_CODES) {
    const values = buckets.get(code);
    const points = values.map((value, index) => {
      if (value) hasArticles = true;
      const x = margin.left + plotWidth * index / Math.max(1, dayCount - 1);
      const y = margin.top + plotHeight * (1 - value / maxValue);
      return [x, y];
    });
    const pathData = points.map(([x, y], index) => `${index ? "L" : "M"}${x},${y}`).join(" ");
    svg.append(makeSvgElement("path", {
      class: "trend-line",
      d: pathData,
      stroke: COUNTRY_TREND_COLORS.get(code),
    }));
    const entry = document.createElement("span");
    const marker = document.createElement("i");
    marker.style.backgroundColor = COUNTRY_TREND_COLORS.get(code);
    const total = values.reduce((sum, value) => sum + value, 0);
    entry.append(marker, createCountryLabel(code), document.createTextNode(` · ${total}`));
    legend.append(entry);
  }
  if (!hasArticles) {
    svg.append(makeSvgElement("text", {
      class: "trend-axis-label",
      x: width / 2,
      y: height / 2,
      "text-anchor": "middle",
    }, "Aucun article sur cette période"));
  }
}

function renderAlertRules() {
  const list = document.querySelector("#alert-rules");
  list.replaceChildren(...alertRules.map((rule) => {
    const item = document.createElement("li");
    const label = document.createElement("span");
    label.append(document.createTextNode(rule.query || "Tous les articles"));
    if (rule.countryCode && COUNTRY_NAMES[rule.countryCode]) {
      label.append(document.createTextNode(" · "), createCountryLabel(rule.countryCode));
    }
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Supprimer";
    remove.setAttribute("aria-label", `Supprimer l’alerte ${label.textContent}`);
    remove.addEventListener("click", () => {
      const index = alertRules.findIndex((candidate) => candidate.id === rule.id);
      if (index < 0) return;
      const [removed] = alertRules.splice(index, 1);
      if (!writeStoredValue(STORAGE_KEYS.alertRules, alertRules)) {
        alertRules.splice(index, 0, removed);
        return;
      }
      document.querySelector("#alert-status").textContent = "Alerte supprimée.";
      renderAlertRules();
    });
    item.append(label, remove);
    return item;
  }));
}

function toggleSavedArticle(article) {
  const wasSaved = savedArticles.has(article.id);
  if (wasSaved) savedArticles.delete(article.id);
  else savedArticles.set(article.id, article);
  if (!writeStoredValue(STORAGE_KEYS.savedArticles, [...savedArticles.values()])) {
    if (wasSaved) savedArticles.set(article.id, article);
    else savedArticles.delete(article.id);
    document.querySelector("#alert-status").textContent = "Stockage local indisponible : l’article n’a pas été modifié.";
    return;
  }
  document.querySelector("#alert-status").textContent = wasSaved
    ? "Article retiré de la liste « À lire plus tard »."
    : "Article enregistré dans « À lire plus tard ».";
  render();
}

function articleMatchesAlert(article, rule) {
  if (rule.countryCode && article.countryCode !== rule.countryCode) return false;
  if (!rule.query.trim()) return true;
  const placeNames = (article.location?.places || []).map((place) => place.name).join(" ");
  const searchable = normalizePlace([
    article.title,
    article.description,
    placeNames,
    article.sourceName,
    ...(article.matchedTerms || []),
  ].join(" "));
  return searchable.includes(normalizePlace(rule.query.trim()));
}

function processNewArticles(articles) {
  const newArticles = articles.filter((article) => !state.seenArticleIds.has(article.id));
  if (state.seenArticlesInitialized && document.visibilityState === "visible") {
    for (const rule of alertRules) {
      const matches = newArticles.filter((article) => articleMatchesAlert(article, rule));
      if (!matches.length) continue;
      const first = matches[0];
      const message = matches.length === 1
        ? `${first.title} · ${first.sourceName}`
        : `${matches.length} nouveaux articles, dont « ${first.title} ».`;
      document.querySelector("#alert-status").textContent = `Alerte : ${message}`;
      if ("Notification" in window && window.Notification.permission === "granted") {
        showBrowserNotification(`Veille · ${rule.query || COUNTRY_NAMES[rule.countryCode]}`, message)
          .catch((error) => {
            console.error("Impossible d’afficher la notification de veille.", error);
            document.querySelector("#alert-status").textContent = "Autorisation accordée, mais le navigateur n’a pas affiché la notification.";
          });
      }
    }
  }
  for (const article of articles) state.seenArticleIds.add(article.id);
  while (state.seenArticleIds.size > 1000) {
    state.seenArticleIds.delete(state.seenArticleIds.values().next().value);
  }
  state.seenArticlesInitialized = true;
  writeStoredValue(STORAGE_KEYS.seenArticles, [...state.seenArticleIds]);
}

async function showBrowserNotification(title, body) {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if (typeof registration.showNotification === "function") {
      await registration.showNotification(title, { body, icon: "/icons/veille-192.png" });
      return;
    }
  }
  new window.Notification(title, { body, icon: "/icons/veille-192.png" });
}

function isIOSWithoutInstalledApp() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return isIOS
    && !navigator.standalone
    && !window.matchMedia("(display-mode: standalone)").matches;
}

function updateNotificationButton() {
  const button = document.querySelector("#notification-permission");
  if (!window.isSecureContext) {
    button.textContent = "Notifications : connexion HTTPS requise";
  } else if (isIOSWithoutInstalledApp()) {
    button.textContent = "Installer Veille pour activer les notifications";
  } else if (!("Notification" in window)) {
    button.textContent = "Notifications non prises en charge";
  } else if (window.Notification.permission === "granted") {
    button.textContent = "Notifications navigateur activées ✓";
  } else if (window.Notification.permission === "denied") {
    button.textContent = "Autorisation à modifier dans les réglages";
  } else {
    button.textContent = "Activer les notifications navigateur";
  }
}

function normalizePlace(value) {
  return value.toLocaleLowerCase("fr").normalize("NFD").replace(/\p{Diacritic}/gu, "");
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
  const selected = articles.filter((article) => isSafeImageUrl(article.image)).slice(0, 6);
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
  meta.append(
    createPublisherMark(article.sourceId, article.sourceName, "publisher-mark-small"),
    document.createTextNode(`${article.sourceName} · ${formatDate(article.publishedAt, article.datePrecision)}`),
  );
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
  card.dataset.type = COLORS[article.type] ? article.type : "autre";

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
      : location.precision === "city"
        ? `Ville citée : ${placeNames} · ${COUNTRY_NAMES[article.countryCode] || ""}`
        : location.precision === "country"
          ? `Pays cité : ${COUNTRY_NAMES[article.countryCode] || "Europe"}`
      : location.precision === "ambiguous"
        ? `Lieu ambigu, non cartographié : ${location.label}`
        : "Lieu non identifié dans le titre ou l’extrait";
  const flag = createCountryFlag(article.countryCode);
  place.append(...(flag ? [flag] : []), placeIcon, placeText);
  toggle.append(meta, title, place);
  card.append(toggle);

  if (isSafeImageUrl(article.image)) {
    const preview = document.createElement("img");
    preview.className = "article-preview";
    preview.src = article.image;
    preview.alt = "";
    preview.loading = "lazy";
    preview.decoding = "async";
    preview.referrerPolicy = "no-referrer";
    preview.addEventListener("error", () => { preview.remove(); card.classList.remove("has-preview"); }, { once: true });
    card.classList.add("has-preview");
    card.append(preview);
  }

  const excerpt = document.createElement("p");
  excerpt.className = "article-excerpt";
  excerpt.textContent = article.description || "Ce flux ne fournit pas d’extrait pour cet article.";
  card.append(excerpt);

  const attribution = document.createElement("div");
  attribution.className = "article-attribution";
  const publisher = document.createElement("span");
  publisher.className = "article-publisher";
  publisher.append(createPublisherMark(article.sourceId, article.sourceName), document.createTextNode(article.sourceName));
  const source = document.createElement("a");
  source.className = "event-source";
  source.href = article.link;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  source.textContent = "Lire l’article complet ↗";
  const saveButton = document.createElement("button");
  const isSaved = savedArticles.has(article.id);
  saveButton.type = "button";
  saveButton.className = `save-article${isSaved ? " saved" : ""}`;
  saveButton.setAttribute("aria-pressed", String(isSaved));
  saveButton.textContent = isSaved ? "Enregistré ✓" : "À lire plus tard";
  saveButton.addEventListener("click", () => toggleSavedArticle(article));
  attribution.append(publisher, saveButton, source);
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
    disclaimer.textContent = "Catégorie attribuée automatiquement selon les mots-clés repérés dans l’article. Ouvre la source pour lire sa publication complète.";
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
  if (!map || !communeMarkerLayer) return { communeCount: 0, departmentCount: 0, countryCount: 0, cityCount: 0 };
  if (state.mapMode === "europe") return renderEuropeMap(articles);
  europeLayer.remove();
  europeMarkerLayer.remove();
  franceLayer.addTo(map);
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

function renderEuropeMap(articles) {
  franceLayer.remove();
  communeMarkerLayer.remove();
  europeLayer.addTo(map);
  europeMarkerLayer.addTo(map);
  europeMarkerLayer.clearLayers();
  const countries = new Map();
  const cities = new Map();
  for (const article of articles) {
    if (!article.countryCode) continue;
    const country = countries.get(article.countryCode) || { articles: new Map() };
    country.articles.set(article.id, article);
    countries.set(article.countryCode, country);
    for (const place of article.location?.places || []) {
      if (!place.coordinates) continue;
      const key = `${article.countryCode}:${normalizePlace(place.name)}`;
      const city = cities.get(key) || { place, countryCode: article.countryCode, articles: new Map() };
      city.articles.set(article.id, article);
      cities.set(key, city);
    }
  }
  countryArticlesByCode = countries;
  countryColors = createSpectrumPalette(countries.keys());
  for (const [code, layer] of countryLayers) {
    const group = countries.get(code);
    layer.setStyle(countryStyle({ properties: { countryCode: code } }));
    layer.setPopupContent(createLocationPopup(
      COUNTRY_NAMES[code],
      group ? [...group.articles.values()] : [],
      "country",
    ));
  }
  for (const [code, group] of countries) {
    if (countryLayers.has(code)) continue;
    const center = EUROPE_COUNTRIES.find((country) => country.code === code)?.center;
    if (!center) continue;
    const color = countryColors.get(code) || "#777a70";
    L.circleMarker(center, {
      radius: 7,
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.9,
    })
      .bindPopup(createLocationPopup(COUNTRY_NAMES[code], [...group.articles.values()], "country-marker", code), { maxWidth: 360, minWidth: 240 })
      .addTo(europeMarkerLayer);
  }
  for (const group of cities.values()) {
    const articlesForCity = [...group.articles.values()];
    const marker = L.marker(group.place.coordinates, {
      icon: L.divIcon({
        className: "map-commune-marker",
        html: `<span style="--marker-color:${countryColors.get(group.countryCode) || "#c8c8be"}"></span>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
      title: `${group.place.name}, ${COUNTRY_NAMES[group.countryCode]} · ${articlesForCity.length} article(s)`,
      alt: `Articles mentionnant ${group.place.name}`,
    });
    marker.bindPopup(createLocationPopup(group.place.name, articlesForCity, "city"), { maxWidth: 360, minWidth: 240 });
    marker.addTo(europeMarkerLayer);
  }
  return { communeCount: 0, departmentCount: 0, countryCount: countries.size, cityCount: cities.size };
}

function createLocationPopup(name, articles, precision, countryCode = null) {
  const popup = document.createElement("div");
  popup.className = "map-popup";
  const heading = document.createElement("strong");
  if (countryCode) heading.append(createCountryLabel(countryCode), document.createTextNode(` · ${articles.length} article${articles.length === 1 ? "" : "s"}`));
  else heading.textContent = `${name} · ${articles.length} article${articles.length === 1 ? "" : "s"}`;
  const note = document.createElement("p");
  note.textContent = precision === "commune"
    ? "La commune est citée dans le titre ou l’extrait ; sa limite et son emplacement exact ne sont pas représentés."
    : precision === "city"
      ? "Cette ville est citée dans un article ; le repère indique son centre approximatif."
      : precision === "country"
        ? "Le contour représente le pays suivi ; il indique une couverture médiatique associée, pas la localisation d’un événement."
        : precision === "country-marker"
          ? "Repère placé approximativement au centre du pays suivi ; il indique une couverture médiatique associée, pas la localisation d’un événement."
        : "La couleur distingue ce département parmi ceux cités dans les articles ; elle représente la couverture éditoriale, pas une intensité.";
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
    item.append(createPublisherMark(source.id, source.name, "publisher-mark-small"), link, status);
    if (source.custom) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-custom-feed";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Supprimer le flux ${source.name}`);
      remove.addEventListener("click", () => removeCustomFeed(source.id));
      item.append(remove);
    }
    return item;
  }));
  document.querySelector("#source-count").textContent = `${state.sources.length} MÉDIAS`;
}

function removeCustomFeed(sourceId) {
  const id = sourceId.replace(/^custom-/, "");
  const index = customFeeds.findIndex((candidate) => candidate.id === id);
  if (index < 0) return;
  const [removed] = customFeeds.splice(index, 1);
  if (!writeStoredValue(STORAGE_KEYS.customFeeds, customFeeds)) {
    customFeeds.splice(index, 0, removed);
    document.querySelector("#custom-feed-status").textContent = "Stockage local indisponible : le flux n’a pas été supprimé.";
    return;
  }
  document.querySelector("#custom-feed-status").textContent = `Flux « ${removed.name} » supprimé.`;
  loadArticles();
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
      fetch("/api/veille", customFeeds.length
        ? {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({ customFeeds }),
        }
        : { headers: { Accept: "application/json" } }),
      geographyPromise,
    ]);
    const payload = await response.json();
    if (!response.ok && response.status !== 503) {
      throw new Error(payload.error || `Réponse inattendue (${response.status})`);
    }
    state.articles = Array.isArray(payload.articles) ? payload.articles.map((article) => enrichArticle(article, geography)) : [];
    state.geography = geography;
    if (response.ok && response.headers.get("X-PWA-Offline") !== "true") {
      processNewArticles(state.articles);
    }
    state.sources = Array.isArray(payload.sources) ? payload.sources : [];
    if (customFeeds.length) {
      const configuredSources = state.sources.filter((source) => source.custom);
      const available = configuredSources.filter((source) => source.status === "ok").length;
      const failed = configuredSources.length - available;
      document.querySelector("#custom-feed-status").textContent = failed
        ? `${available}/${configuredSources.length} flux personnel${configuredSources.length > 1 ? "s" : ""} disponible${available > 1 ? "s" : ""} · ${failed} indisponible${failed > 1 ? "s" : ""}. Vérifie les URL et l’accès public.`
        : `${available} flux personnel${available > 1 ? "s" : ""} chargé${available > 1 ? "s" : ""}.`;
    }
    state.fetchedAt = payload.fetchedAt || null;
    if (response.headers.get("X-PWA-Offline") === "true") {
      updateStatus("partial", `Hors connexion · dernières données du ${formatClock(state.fetchedAt)}.`);
    } else if (response.status === 503) {
      updateStatus("error", "Aucun flux disponible — réessaie dans quelques minutes.");
    } else if (payload.warning) {
      updateStatus("partial", `${payload.warning} Actualisé ${formatClock(state.fetchedAt)}.`);
    } else {
      updateStatus("ready", `${state.sources.length} médias · actualisé ${formatClock(state.fetchedAt)}.`);
    }
    render();
    if (state.selectedDate) loadArchiveDay(state.selectedDate);
  } catch (error) {
    console.error("Impossible de charger la veille de presse.", error);
    if (customFeeds.length) {
      document.querySelector("#custom-feed-status").textContent = `Impossible d’interroger les flux personnels : ${error.message}`;
    }
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
  state.selectedDate = "";
  if (button.dataset.period === "today") state.calendarMonth = toDateKey(new Date()).slice(0, 7);
  syncSharedViewControls();
  updateShareUrl();
  render();
});

document.querySelector("#day-calendar").addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const dayButton = target?.closest("[data-cal-day]");
  if (dayButton) {
    setSelectedDate(dayButton.dataset.calDay === state.selectedDate ? "" : dayButton.dataset.calDay);
    return;
  }
  const nav = target?.closest("[data-cal-nav]");
  if (!nav) return;
  const [year, month] = state.calendarMonth.split("-").map(Number);
  state.calendarMonth = toDateKey(new Date(year, month - 1 + Number(nav.dataset.calNav), 1)).slice(0, 7);
  renderDayCalendar();
});

document.querySelector("#map-mode-controls").addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("[data-map-mode]") : null;
  if (!button || button.dataset.mapMode === state.mapMode) return;
  state.mapMode = button.dataset.mapMode;
  state.selected = null;
  updateShareUrl();
  document.querySelectorAll("[data-map-mode]").forEach((item) => {
    const active = item === button;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  render();
  if (map) {
    if (state.mapMode === "europe") {
      map.fitBounds(EUROPE_COUNTRIES.map(({ center }) => center), { padding: [12, 12], maxZoom: 5 });
    } else {
      const layers = [...departmentLayers.values()];
      if (layers.length) map.fitBounds(L.featureGroup(layers).getBounds().pad(0.04));
    }
  }
});

document.querySelector("#country-filter").addEventListener("change", (event) => {
  state.country = event.target.value;
  updateShareUrl();
  if (state.selectedDate) loadArchiveDay(state.selectedDate);
  render();
});

document.querySelector("#coverage-compare-list").addEventListener("click", (event) => {
  const button = event.target instanceof Element ? event.target.closest("[data-country]") : null;
  if (!button) return;
  state.country = state.country === button.dataset.country ? "all" : button.dataset.country;
  document.querySelector("#country-filter").value = state.country;
  updateShareUrl();
  render();
});

document.querySelector("#type-filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-type]");
  if (!button) return;
  state.type = button.dataset.type;
  document.querySelectorAll("[data-type]").forEach((item) => item.classList.toggle("active", item === button));
  updateShareUrl();
  render();
});

document.querySelector("#search-input").addEventListener("input", (event) => {
  state.query = event.target.value.trim().toLocaleLowerCase("fr");
  updateShareUrl();
  render();
});

document.querySelector("#share-view").addEventListener("click", async () => {
  const status = document.querySelector("#share-status");
  updateShareUrl();
  try {
    await navigator.clipboard.writeText(window.location.href);
    status.textContent = "Lien avec les filtres copiés.";
  } catch (error) {
    console.error("Impossible de copier le lien de partage.", error);
    status.textContent = "Copie impossible. Vérifie l’autorisation du presse-papiers dans le navigateur.";
  }
});

document.querySelector("#custom-feed-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#custom-feed-name").value.trim();
  const feedUrl = document.querySelector("#custom-feed-url").value.trim();
  const countryCode = document.querySelector("#custom-feed-country").value;
  const status = document.querySelector("#custom-feed-status");
  if (!isPublicFeedUrl(feedUrl)) {
    status.textContent = "Seuls les flux publics HTTPS sans adresse locale ni redirection sont acceptés.";
    return;
  }
  const url = new URL(feedUrl);
  if (customFeeds.length >= 5) {
    status.textContent = "La limite de cinq flux personnels est atteinte.";
    return;
  }
  if (customFeeds.some((item) => item.feed === url.href)) {
    status.textContent = "Ce flux est déjà dans ta liste.";
    return;
  }
  const customFeed = {
    id: crypto.randomUUID().replaceAll("-", ""),
    name: name.slice(0, 60),
    feed: url.href,
    countryCode,
  };
  customFeeds.push(customFeed);
  if (!writeStoredValue(STORAGE_KEYS.customFeeds, customFeeds)) {
    customFeeds.pop();
    status.textContent = "Stockage local indisponible : le flux n’a pas été ajouté.";
    return;
  }
  document.querySelector("#custom-feed-name").value = "";
  document.querySelector("#custom-feed-url").value = "";
  document.querySelector("#custom-feed-country").value = "";
  status.textContent = "Flux ajouté. Vérification et chargement des articles…";
  loadArticles();
});

document.querySelector("#trend-period").addEventListener("change", renderTrends);
document.querySelector("#trend-type").addEventListener("change", renderTrends);

document.querySelector("#group-by").addEventListener("change", (event) => {
  state.groupBy = GROUP_MODES.includes(event.target.value) ? event.target.value : "default";
  render();
});

document.querySelector("#sort-button").addEventListener("click", () => {
  state.newestFirst = !state.newestFirst;
  render();
});

document.querySelector("#saved-filter").addEventListener("click", () => {
  state.showSaved = !state.showSaved;
  render();
});

document.querySelector("#alert-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const query = document.querySelector("#alert-query").value.trim();
  const countryCode = document.querySelector("#alert-country").value;
  const status = document.querySelector("#alert-status");
  if (!query && !countryCode) {
    status.textContent = "Saisis une ville ou un mot-clé, ou choisis un pays.";
    return;
  }
  if (alertRules.some((rule) => normalizePlace(rule.query) === normalizePlace(query)
    && rule.countryCode === countryCode)) {
    status.textContent = "Cette alerte existe déjà.";
    return;
  }
  const rule = { id: crypto.randomUUID(), query, countryCode };
  alertRules.push(rule);
  if (!writeStoredValue(STORAGE_KEYS.alertRules, alertRules)) {
    alertRules.pop();
    status.textContent = "Stockage local indisponible : l’alerte n’a pas été créée.";
    return;
  }
  document.querySelector("#alert-query").value = "";
  document.querySelector("#alert-country").value = "";
  status.textContent = "Alerte créée. Elle se déclenchera sur les prochains articles reçus.";
  renderAlertRules();
});

document.querySelector("#notification-permission").addEventListener("click", async () => {
  const status = document.querySelector("#alert-status");
  if (!window.isSecureContext) {
    status.textContent = "Les notifications exigent une connexion sécurisée HTTPS.";
    return;
  }
  if (isIOSWithoutInstalledApp()) {
    status.textContent = "Sur iPhone ou iPad, ajoute Veille à l’écran d’accueil puis ouvre l’application depuis son icône pour activer les notifications.";
    return;
  }
  if (!("Notification" in window)) {
    status.textContent = "Les notifications navigateur ne sont pas prises en charge.";
    return;
  }
  if (window.Notification.permission === "granted") {
    status.textContent = "Les notifications sont déjà autorisées pour Veille.";
    updateNotificationButton();
    return;
  }
  if (window.Notification.permission === "denied") {
    status.textContent = "L’autorisation a déjà été refusée. Modifie-la dans les réglages de notifications du navigateur pour ce site.";
    updateNotificationButton();
    return;
  }
  if (typeof window.Notification.requestPermission !== "function") {
    status.textContent = "Ce navigateur ne permet pas de demander l’autorisation des notifications.";
    return;
  }
  try {
    const permission = await window.Notification.requestPermission();
    status.textContent = permission === "granted"
      ? "Notifications activées. Elles apparaîtront lors de la réception de nouveaux articles correspondants."
      : permission === "denied"
        ? "Notifications refusées dans le navigateur. Tu peux modifier ce choix dans ses réglages."
        : "Autorisation non accordée.";
    updateNotificationButton();
  } catch (error) {
    console.error("Impossible de demander l’autorisation des notifications.", error);
    status.textContent = "Impossible d’activer les notifications. Vérifie les réglages du navigateur et, sur iPhone/iPad, ouvre Veille depuis l’écran d’accueil.";
  }
});

const backToTopButton = document.querySelector("#back-to-top");
const updateBackToTopVisibility = () => {
  backToTopButton.hidden = window.scrollY < 500;
};

window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });
backToTopButton.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
});
updateBackToTopVisibility();

document.querySelector("#reset-filters").addEventListener("click", () => {
  state.period = "all";
  state.selectedDate = "";
  state.type = "all";
  state.country = "all";
  state.query = "";
  state.selected = null;
  document.querySelector("#search-input").value = "";
  renderDayCalendar();
  document.querySelectorAll("[data-period]").forEach((item) => item.classList.toggle("active", item.dataset.period === "all"));
  document.querySelectorAll("[data-type]").forEach((item) => item.classList.toggle("active", item.dataset.type === "all"));
  document.querySelector("#country-filter").value = "all";
  updateShareUrl();
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
    if ((!channel?.id && !channel?.embedUrl) || poster.querySelector("iframe")) return;

    const player = document.createElement("iframe");
    player.className = "stream-player";
    player.title = `Direct ${channel.name}`;
    player.src = channel.embedUrl || `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channel.id)}&autoplay=1&mute=1`;
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

document.querySelectorAll(".stream-site-link[data-channel]").forEach((link) => {
  link.href = LIVE_CHANNELS[link.dataset.channel]?.siteUrl || link.href;
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

syncSharedViewControls();
loadArticles();
renderAlertRules();
updateNotificationButton();
window.setInterval(() => {
  if (document.visibilityState === "visible") loadArticles();
}, 5 * 60 * 1000);

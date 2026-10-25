const LOCATION_CUES = new Set(["a", "au", "aux", "dans", "en"]);
const COMMON_WORD_COMMUNES = new Set(["vue", "nice", "orange", "sens", "romans", "gap", "bar", "vie", "belle", "salles", "celles", "marche", "arc", "vire", "long", "chat", "mars"]);

function normalizeName(value) {
  return value.toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’'`-]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function nameVariants(name) {
  const normalized = normalizeName(name);
  return new Set([
    normalized,
    normalized.replace(/\bsaint\b/g, "st"),
    normalized.replace(/\bsainte\b/g, "ste"),
    normalized.replace(/^(?:l|le|la|les) /, ""),
  ]);
}

function hasClearCommonNameCapitalization(text, name) {
  if (!COMMON_WORD_COMMUNES.has(normalizeName(name))) return true;
  const pattern = name.split(/[\s'’`-]+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s'’`-]+");
  return new RegExp(`(^|[^\\p{L}])${pattern}(?=$|[^\\p{L}])`, "u").test(text);
}

function hasTitleDatelineCue(text, name) {
  const escapedName = name.split(/[\s'’`-]+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s'’`-]+");
  return new RegExp(`^\\s*${escapedName}\\s*(?:[:,—–-])`, "u").test(text);
}

function createNameIndex(entries) {
  const index = new Map();
  let maxWords = 1;
  for (const entry of entries) {
    for (const variant of nameVariants(entry.name)) {
      if (!variant) continue;
      maxWords = Math.max(maxWords, variant.split(" ").length);
      const matches = index.get(variant) || [];
      if (!matches.some((match) => match.code === entry.code)) matches.push(entry);
      index.set(variant, matches);
    }
  }
  return { index, maxWords };
}

export function createGeographyIndex(communes, departments) {
  const departmentEntries = departments.features.map((feature) => ({
    code: feature.properties.code,
    name: feature.properties.nom,
  }));
  const communeEntries = communes.map(([name, code, departmentCode, longitude, latitude]) => ({
    code,
    name,
    departmentCode,
    coordinates: [latitude, longitude],
  }));
  return {
    communes: createNameIndex(communeEntries),
    departments: createNameIndex(departmentEntries),
    departmentByCode: new Map(departmentEntries.map((department) => [department.code, department])),
  };
}

export function createSpectrumPalette(codes) {
  const sortedCodes = [...new Set(codes)].sort((a, b) => a.localeCompare(b, "fr", { numeric: true }));
  const hueOffset = 205;
  return new Map(sortedCodes.map((code, index) => [
    code,
    `hsl(${Math.round((hueOffset + index * 360 / sortedCodes.length) % 360)} 82% 64%)`,
  ]));
}

function hasLocationCue(tokens, start, isDepartment) {
  if (isDepartment && tokens[start - 1] === "en") return true;
  if (LOCATION_CUES.has(tokens[start - 1])) return true;
  const prefix = tokens.slice(Math.max(0, start - 3), start).join(" ");
  return /(?:^| )(?:a proximite de|a cote de|autour de|pres de|dans la|dans le|dans les|dans l|departement de|departement de la|departement du|departement des|departement de l)$/.test(prefix);
}

function findMentions(text, nameIndex, isTitle, isDepartment = false, field = "description") {
  const tokens = normalizeName(text).split(" ").filter(Boolean);
  const candidates = [];
  for (let start = 0; start < tokens.length; start += 1) {
    for (let length = Math.min(nameIndex.maxWords, tokens.length - start); length > 0; length -= 1) {
      const name = tokens.slice(start, start + length).join(" ");
      const entries = nameIndex.index.get(name);
      const hasCue = hasLocationCue(tokens, start, isDepartment);
      const hasDateline = isTitle && start === 0 && entries?.some((entry) => hasTitleDatelineCue(text, entry.name));
      if (!entries || (!hasCue && !hasDateline)) continue;
      const clearEntries = entries.filter((entry) => hasClearCommonNameCapitalization(text, entry.name));
      if (!clearEntries.length) continue;
      candidates.push({
        entries: clearEntries,
        start,
        end: start + length - 1,
        length,
        evidence: {
          field,
          text: text.trim().slice(0, 280),
          signal: hasCue ? "location-cue" : "title-dateline",
          confidence: hasCue ? "medium" : "low",
        },
      });
      break;
    }
  }

  candidates.sort((a, b) => b.length - a.length || a.start - b.start);
  const accepted = [];
  for (const candidate of candidates) {
    if (!accepted.some((match) => candidate.start <= match.end && candidate.end >= match.start)) {
      accepted.push(candidate);
    }
  }
  return accepted;
}

function resolveMentions(mentions, departmentMentions) {
  const departments = new Set(departmentMentions.flatMap((mention) => mention.entries.map((entry) => entry.code)));
  const places = [];
  const ambiguousNames = [];
  const ambiguousEvidence = [];
  for (const mention of mentions) {
    const matches = mention.entries.length > 1
      ? mention.entries.filter((entry) => departments.has(entry.departmentCode))
      : mention.entries;
    if (matches.length !== 1) {
      ambiguousNames.push(mention.entries[0].name);
      ambiguousEvidence.push(mention.evidence);
      continue;
    }
    if (!places.some((place) => place.code === matches[0].code)) {
      places.push({ ...matches[0], evidence: mention.evidence });
    }
  }
  return { places, ambiguousNames, ambiguousEvidence };
}

export function locateArticle(article, geography) {
  const title = article.title || "";
  const description = article.description || "";
  const departments = [
    ...findMentions(title, geography.departments, true, true, "title"),
    ...findMentions(description, geography.departments, false, true, "description"),
  ];
  const communes = resolveMentions([
    ...findMentions(title, geography.communes, true, false, "title"),
    ...findMentions(description, geography.communes, false, false, "description"),
  ], departments);

  if (communes.ambiguousNames.length) {
    return {
      precision: "ambiguous",
      places: [],
      label: [...new Set(communes.ambiguousNames)].join(", "),
      evidence: communes.ambiguousEvidence[0] || null,
    };
  }
  if (communes.places.length) {
    return {
      precision: "commune",
      role: "mentioned",
      places: communes.places.map(({ evidence, ...place }) => ({
        code: place.code,
        name: place.name,
        countryCode: "FR",
        departmentCode: place.departmentCode,
        precision: "commune",
        coordinates: place.coordinates,
        confidence: evidence.confidence,
        evidence,
      })),
    };
  }

  const departmentPlaces = resolveMentions(departments, []).places;
  if (departmentPlaces.length) {
    return {
      precision: "department",
      role: "mentioned",
      places: departmentPlaces.map(({ evidence, ...place }) => ({
        code: place.code,
        name: place.name,
        countryCode: "FR",
        departmentCode: place.code,
        precision: "department",
        confidence: evidence.confidence,
        evidence,
      })),
    };
  }
  return { precision: "unknown", places: [] };
}

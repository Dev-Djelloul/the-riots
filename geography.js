const LOCATION_CUES = new Set(["a", "au", "aux", "chez", "dans", "de", "des", "du", "vers", "sur"]);

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

function hasLocationCue(tokens, start, isTitle, isDepartment) {
  if (isTitle && start === 0) return true;
  if (isDepartment && tokens[start - 1] === "en") return true;
  if (LOCATION_CUES.has(tokens[start - 1])) return true;
  const prefix = tokens.slice(Math.max(0, start - 3), start).join(" ");
  return /(?:^| )(?:a proximite de|a cote de|autour de|pres de|dans la|dans le|dans les|dans l|departement de|departement de la|departement du|departement des)$/.test(prefix);
}

function findMentions(text, nameIndex, isTitle, isDepartment = false) {
  const tokens = normalizeName(text).split(" ").filter(Boolean);
  const candidates = [];
  for (let start = 0; start < tokens.length; start += 1) {
    for (let length = Math.min(nameIndex.maxWords, tokens.length - start); length > 0; length -= 1) {
      const name = tokens.slice(start, start + length).join(" ");
      const entries = nameIndex.index.get(name);
      if (!entries || !hasLocationCue(tokens, start, isTitle, isDepartment)) continue;
      candidates.push({ entries, start, end: start + length - 1, length });
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
  for (const mention of mentions) {
    const matches = mention.entries.length > 1
      ? mention.entries.filter((entry) => departments.has(entry.departmentCode))
      : mention.entries;
    if (matches.length !== 1) {
      ambiguousNames.push(mention.entries[0].name);
      continue;
    }
    if (!places.some((place) => place.code === matches[0].code)) places.push(matches[0]);
  }
  return { places, ambiguousNames };
}

export function locateArticle(article, geography) {
  const title = article.title || "";
  const description = article.description || "";
  const departments = [
    ...findMentions(title, geography.departments, true, true),
    ...findMentions(description, geography.departments, false, true),
  ];
  const communes = resolveMentions([
    ...findMentions(title, geography.communes, true),
    ...findMentions(description, geography.communes, false),
  ], departments);

  if (communes.ambiguousNames.length) {
    return { precision: "ambiguous", places: [], label: [...new Set(communes.ambiguousNames)].join(", ") };
  }
  if (communes.places.length) {
    return {
      precision: "commune",
      places: communes.places.map((place) => ({
        code: place.code,
        name: place.name,
        departmentCode: place.departmentCode,
        precision: "commune",
        coordinates: place.coordinates,
      })),
    };
  }

  const departmentPlaces = resolveMentions(departments, []).places;
  if (departmentPlaces.length) {
    return {
      precision: "department",
      places: departmentPlaces.map((place) => ({
        code: place.code,
        name: place.name,
        departmentCode: place.code,
        precision: "department",
      })),
    };
  }
  return { precision: "unknown", places: [] };
}

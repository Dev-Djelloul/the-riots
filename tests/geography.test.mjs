import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createGeographyIndex, createSpectrumPalette, locateArticle } from "../geography.js";

const communes = JSON.parse(readFileSync(new URL("../data/communes.json", import.meta.url), "utf8"));
const departments = JSON.parse(readFileSync(new URL("../data/departements.geojson", import.meta.url), "utf8"));
const europe = JSON.parse(readFileSync(new URL("../data/europe-countries.geojson", import.meta.url), "utf8"));
const geography = createGeographyIndex(communes, departments);

test("couvre les 96 départements et le référentiel des communes métropolitaines", () => {
  assert.equal(departments.features.length, 96);
  assert.equal(communes.length, 34746);
  assert.ok(departments.features.some((feature) => feature.properties.code === "2A"));
  assert.ok(departments.features.some((feature) => feature.properties.code === "2B"));
  assert.ok(!departments.features.some((feature) => feature.properties.code === "971"));
});

test("fournit les contours des cinq pays de la vue pilote européenne", () => {
  const codes = europe.features.map((feature) => feature.properties.countryCode).sort();
  assert.deepEqual(codes, ["BE", "DE", "ES", "FR", "IT"]);
  assert.ok(europe.features.every((feature) => ["Polygon", "MultiPolygon"].includes(feature.geometry.type)));
});

test("repère une commune citée dans le titre et une commune dans l’extrait", () => {
  const titleLocation = locateArticle({ title: "Manifestation à Angoulême", description: "" }, geography);
  assert.equal(titleLocation.precision, "commune");
  assert.deepEqual(titleLocation.places[0], {
    code: "16015",
    name: "Angoulême",
    departmentCode: "16",
    precision: "commune",
    coordinates: [45.6458, 0.145],
  });

  const excerptLocation = locateArticle({
    title: "Des tensions après un rassemblement",
    description: "La manifestation a rassemblé plusieurs personnes à Carcassonne.",
  }, geography);
  assert.equal(excerptLocation.places[0].name, "Carcassonne");
});

test("utilise une mention de département sans inventer une commune", () => {
  const location = locateArticle({ title: "Tensions dans le Rhône", description: "" }, geography);
  assert.equal(location.precision, "department");
  assert.equal(location.places[0].code, "69");
  assert.equal(location.places[0].name, "Rhône");
});

test("signale les homonymes et peut les lever avec le département", () => {
  const ambiguous = locateArticle({ title: "Manifestation à Saint-Martin", description: "" }, geography);
  assert.equal(ambiguous.precision, "ambiguous");
  assert.deepEqual(ambiguous.places, []);

  const resolved = locateArticle({
    title: "Manifestation à Saint-Denis en Seine-Saint-Denis",
    description: "",
  }, geography);
  assert.equal(resolved.precision, "commune");
  assert.equal(resolved.places[0].code, "93066");
});

test("ne cartographie pas un article sans lieu identifié", () => {
  const location = locateArticle({ title: "Manifestation nationale en France", description: "" }, geography);
  assert.equal(location.precision, "unknown");
  assert.deepEqual(location.places, []);
});

test("évite de prendre le nom commun « vue » pour la commune de Vue", () => {
  const expression = locateArticle({ title: "Violences: gardes à vue", description: "" }, geography);
  assert.equal(expression.precision, "unknown");

  const locality = locateArticle({ title: "Rassemblement à Vue", description: "" }, geography);
  assert.equal(locality.precision, "commune");
  assert.equal(locality.places[0].code, "44220");
});

test("attribue une teinte distincte du spectre à chaque département concerné", () => {
  const palette = createSpectrumPalette(["75", "69", "13", "2A", "75"]);
  assert.equal(palette.size, 4);
  assert.equal(new Set(palette.values()).size, 4);
  assert.deepEqual([...palette.keys()], ["2A", "13", "69", "75"]);
  assert.ok([...palette.values()].every((color) => /^hsl\(\d+ 82% 64%\)$/.test(color)));
});

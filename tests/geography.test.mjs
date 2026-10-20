import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createGeographyIndex, locateArticle } from "../geography.js";

const communes = JSON.parse(readFileSync(new URL("../data/communes.json", import.meta.url), "utf8"));
const departments = JSON.parse(readFileSync(new URL("../data/departements.geojson", import.meta.url), "utf8"));
const geography = createGeographyIndex(communes, departments);

test("couvre les 96 départements et le référentiel des communes métropolitaines", () => {
  assert.equal(departments.features.length, 96);
  assert.equal(communes.length, 34746);
  assert.ok(departments.features.some((feature) => feature.properties.code === "2A"));
  assert.ok(departments.features.some((feature) => feature.properties.code === "2B"));
  assert.ok(!departments.features.some((feature) => feature.properties.code === "971"));
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

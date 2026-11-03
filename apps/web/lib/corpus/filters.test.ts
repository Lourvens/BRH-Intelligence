import { describe, expect, test } from "bun:test";
import {
  ATLAS_FILTER_KEYS,
  CATALOGUE_CHIP_KEYS,
  FILTER_ALL,
  activeAtlasFilters,
  atlasFilterFields,
  catalogueChipLabel,
  catalogueFilterFields,
  entityKindOptions,
  familyOptions,
  formatFilterOption,
  isActiveFilterValue,
  relationshipOptions,
  sortOptions,
  staticFamilyOptions,
  yearOptions,
} from "./filters";
import { entityLabels, familyLabels, relationshipLabels } from "./labels";
import type { Facets } from "./types";

const facets: Facets = {
  families: [
    { family: "circular", count: 12 },
    { family: "unknown", count: 3 },
  ],
  years: [2024, 2023],
};

describe("filter values", () => {
  test("only real values are active", () => {
    expect(FILTER_ALL).toBe("all");
    expect(isActiveFilterValue("")).toBe(false);
    expect(isActiveFilterValue(null)).toBe(false);
    expect(isActiveFilterValue(undefined)).toBe(false);
    expect(isActiveFilterValue("all")).toBe(false);
    expect(isActiveFilterValue("circular")).toBe(true);
  });
  test("formatFilterOption carries catalogue counts", () => {
    expect(formatFilterOption({ value: "circular", label: "Circulaires" })).toBe(
      "Circulaires",
    );
    expect(
      formatFilterOption({ value: "circular", label: "Circulaires", count: 12 }),
    ).toBe("Circulaires (12)");
  });
});

describe("option models", () => {
  test("familyOptions maps facet counts and labels", () => {
    expect(familyOptions(facets)).toEqual([
      { value: "circular", label: "Circulaires et réglementation", count: 12 },
      { value: "unknown", label: "Non classé", count: 3 },
    ]);
  });
  test("staticFamilyOptions has no counts and covers every label", () => {
    const options = staticFamilyOptions();
    expect(options).toHaveLength(Object.keys(familyLabels).length);
    expect(options[0]).toEqual({
      value: "circular",
      label: "Circulaires et réglementation",
    });
  });
  test("yearOptions stringifies facet years", () => {
    expect(yearOptions(facets)).toEqual([
      { value: "2024", label: "2024" },
      { value: "2023", label: "2023" },
    ]);
  });
  test("kind, relationship and sort options keep the published order", () => {
    expect(entityKindOptions()[0]).toEqual({
      value: "institution",
      label: "Institution",
    });
    expect(entityKindOptions()).toHaveLength(Object.keys(entityLabels).length);
    expect(relationshipOptions()[0]).toEqual({
      value: "references",
      label: "fait référence à",
    });
    expect(relationshipOptions()).toHaveLength(
      Object.keys(relationshipLabels).length,
    );
    expect(sortOptions()).toEqual([
      { value: "title", label: "Titre A à Z" },
      { value: "period", label: "Période récente" },
      { value: "recent", label: "Ajouts récents" },
    ]);
  });
  test("catalogue fields follow the entities flag", () => {
    expect(catalogueFilterFields(facets, true)).toEqual([
      {
        key: "kind",
        label: "Type d’entité",
        options: entityKindOptions(),
      },
    ]);
    expect(catalogueFilterFields(facets, false)).toEqual([
      { key: "family", label: "Collection", options: familyOptions(facets) },
      { key: "year", label: "Période couverte", options: yearOptions(facets) },
    ]);
  });
  test("atlas fields only expose relationships in the relations view", () => {
    expect(atlasFilterFields("mentions").map((field) => field.key)).toEqual([
      "family",
      "kind",
    ]);
    expect(atlasFilterFields("relations").map((field) => field.key)).toEqual([
      "family",
      "kind",
      "relationship",
    ]);
    expect(ATLAS_FILTER_KEYS).toEqual([
      "family",
      "year",
      "kind",
      "relationship",
      "orphans",
    ]);
    expect(CATALOGUE_CHIP_KEYS).toEqual([
      "family",
      "year",
      "kind",
      "entity_id",
      "document_id",
    ]);
  });
});

describe("active atlas filters", () => {
  test("labels each active criterion, including search and orphans", () => {
    const search = new URLSearchParams(
      "q=inflation&family=circular&kind=all&relationship=references&orphans=true&year=",
    );
    expect(activeAtlasFilters(search)).toEqual([
      { key: "q", label: "Recherche : inflation" },
      { key: "family", label: "Circulaires et réglementation" },
      { key: "relationship", label: "fait référence à" },
      { key: "orphans", label: "Sans connexion inclus" },
    ]);
  });
  test("ignores an unchecked orphans box and unknown values fall back", () => {
    expect(activeAtlasFilters(new URLSearchParams("orphans=false"))).toEqual([]);
    expect(activeAtlasFilters(new URLSearchParams("family=autre"))).toEqual([
      { key: "family", label: "autre" },
    ]);
  });
});

describe("catalogue chip labels", () => {
  test("resolves families, kinds and selection placeholders", () => {
    expect(catalogueChipLabel("family", "circular")).toBe(
      "Circulaires et réglementation",
    );
    expect(catalogueChipLabel("kind", "institution")).toBe("Institution");
    expect(catalogueChipLabel("entity_id", "abc")).toBe("Entité sélectionnée");
    expect(catalogueChipLabel("document_id", "abc")).toBe(
      "Document sélectionné",
    );
    expect(catalogueChipLabel("year", "2024")).toBe("2024");
    expect(catalogueChipLabel("family", "autre")).toBe("autre");
  });
});

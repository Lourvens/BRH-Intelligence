import {
  entityLabel,
  entityLabels,
  familyLabel,
  familyLabels,
  relationshipLabel,
  relationshipLabels,
} from "./labels";
import type { Facets } from "./types";

/** Sentinel shared by every corpus filter select for "no constraint". */
export const FILTER_ALL = "all";

export const CATALOGUE_CHIP_KEYS = [
  "family",
  "year",
  "kind",
  "entity_id",
  "document_id",
] as const;

export const ATLAS_FILTER_KEYS = [
  "family",
  "year",
  "kind",
  "relationship",
  "orphans",
] as const;

export type FilterOption = { value: string; label: string; count?: number };
export type FilterField = { key: string; label: string; options: FilterOption[] };

export function isActiveFilterValue(value: string | null | undefined): boolean {
  return !!value && value !== FILTER_ALL;
}

export function formatFilterOption(option: FilterOption): string {
  return option.count === undefined
    ? option.label
    : `${option.label} (${option.count})`;
}

export function familyOptions(facets: Facets): FilterOption[] {
  return facets.families.map(({ family, count }) => ({
    value: family,
    label: familyLabel(family),
    count,
  }));
}

export function staticFamilyOptions(): FilterOption[] {
  return Object.entries(familyLabels).map(([value, label]) => ({
    value,
    label,
  }));
}

export function yearOptions(facets: Facets): FilterOption[] {
  return facets.years.map((year) => ({
    value: String(year),
    label: String(year),
  }));
}

export function entityKindOptions(): FilterOption[] {
  return Object.entries(entityLabels).map(([value, label]) => ({
    value,
    label,
  }));
}

export function relationshipOptions(): FilterOption[] {
  return Object.entries(relationshipLabels).map(([value, label]) => ({
    value,
    label,
  }));
}

export function sortOptions(): FilterOption[] {
  return [
    { value: "title", label: "Titre A à Z" },
    { value: "period", label: "Période récente" },
    { value: "recent", label: "Ajouts récents" },
  ];
}

export function catalogueFilterFields(
  facets: Facets,
  entities: boolean,
): FilterField[] {
  if (entities)
    return [
      {
        key: "kind",
        label: "Type d’entité",
        options: entityKindOptions(),
      },
    ];
  return [
    { key: "family", label: "Collection", options: familyOptions(facets) },
    { key: "year", label: "Période couverte", options: yearOptions(facets) },
  ];
}

export function atlasFilterFields(view: string): FilterField[] {
  return [
    { key: "family", label: "Collection", options: staticFamilyOptions() },
    { key: "kind", label: "Type d’entité", options: entityKindOptions() },
    ...(view === "relations"
      ? [{ key: "relationship", label: "Relation", options: relationshipOptions() }]
      : []),
  ];
}

export function catalogueChipLabel(key: string, value: string): string {
  if (key === "family") return familyLabel(value);
  if (key === "kind") return entityLabel(value);
  if (key.endsWith("_id"))
    return key === "entity_id" ? "Entité sélectionnée" : "Document sélectionné";
  return value;
}

function atlasFilterLabel(key: string, value: string): string {
  if (key === "family") return familyLabel(value);
  if (key === "kind") return entityLabel(value);
  if (key === "relationship") return relationshipLabel(value);
  return value;
}

export function activeAtlasFilters(
  search: Pick<URLSearchParams, "get">,
): { key: string; label: string }[] {
  return ["q", ...ATLAS_FILTER_KEYS].flatMap((key) => {
    const value = search.get(key);
    if (!value || (key === "orphans" ? value !== "true" : value === FILTER_ALL))
      return [];
    const label =
      key === "q"
        ? `Recherche : ${value}`
        : key === "orphans"
          ? "Sans connexion inclus"
          : atlasFilterLabel(key, value);
    return [{ key, label }];
  });
}

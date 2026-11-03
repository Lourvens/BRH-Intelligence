"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ATLAS_FILTER_KEYS,
  FILTER_ALL,
  atlasFilterFields,
} from "@/lib/corpus/filters";
import { FilterSelect } from "./filter-select";

export function AtlasFilterFields({
  draft,
  setDraft,
  view,
  onSubmit,
  onReset,
}: {
  draft: Record<string, string>;
  setDraft: (values: Record<string, string>) => void;
  view: string;
  onSubmit: (changes: Record<string, string>) => void;
  onReset: () => void;
}) {
  return (
    <form
      className="atlas-map-filter-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(
          Object.fromEntries(
            ATLAS_FILTER_KEYS.map((key) => [
              key,
              draft[key] === FILTER_ALL ? "" : (draft[key] ?? ""),
            ]),
          ),
        );
      }}
    >
      {atlasFilterFields(view).map(({ key, label, options }) => (
        <FilterSelect
          key={key}
          id={`atlas-${key}`}
          label={label}
          value={draft[key] ?? ""}
          options={options}
          onValueChange={(value) => value && setDraft({ ...draft, [key]: value })}
        />
      ))}
      <div>
        <label htmlFor="atlas-year">Année de la période couverte</label>
        <Input
          id="atlas-year"
          type="number"
          min={1800}
          max={2200}
          step={1}
          placeholder="Toutes les années"
          value={draft.year ?? ""}
          onChange={(event) => setDraft({ ...draft, year: event.target.value })}
        />
      </div>
      {view === "mentions" && (
        <label className="atlas-map-checkbox">
          <input
            type="checkbox"
            checked={draft.orphans === "true"}
            onChange={(event) =>
              setDraft({
                ...draft,
                orphans: event.target.checked ? "true" : "",
              })
            }
          />
          Inclure les documents sans connexion
        </label>
      )}
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onReset}>
          Réinitialiser
        </Button>
        <Button type="submit" className="flex-1">
          Appliquer
        </Button>
      </div>
    </form>
  );
}

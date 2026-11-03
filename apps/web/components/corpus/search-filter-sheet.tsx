"use client";

import { Button } from "@/components/ui/button";
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  catalogueFilterFields,
  formatFilterOption,
} from "@/lib/corpus/filters";
import type { Facets } from "@/lib/corpus/types";
import { FilterSelect } from "./filter-select";

export function SearchFilterSheet({
  entities,
  facets,
  draft,
  setDraft,
  onApply,
}: {
  entities: boolean;
  facets: Facets;
  draft: Record<string, string>;
  setDraft: (values: Record<string, string>) => void;
  onApply: () => void;
}) {
  const fields = catalogueFilterFields(facets, entities);
  return (
    <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Affiner votre exploration</SheetTitle>
        <SheetDescription>
          Choisissez les critères, puis appliquez-les.
        </SheetDescription>
      </SheetHeader>
      <div className="space-y-7 px-5">
        <div className="space-y-5">
          {fields.map((field) => {
            const selected = field.options.find(
              (option) => option.value === draft[field.key],
            );
            return (
              <FilterSelect
                key={field.key}
                id={`sheet-${field.key}`}
                label={field.label}
                value={draft[field.key] ?? ""}
                options={field.options}
                onValueChange={(value) =>
                  setDraft({ ...draft, [field.key]: value })
                }
                allLabel="Tout afficher"
                displayValue={
                  selected ? formatFilterOption(selected) : "Tout afficher"
                }
                labelClassName="mb-2 block text-small font-medium"
                triggerClassName="h-11 w-full rounded-xl"
              />
            );
          })}
          <p className="text-caption leading-5 text-ink-muted">
            La période décrit le contenu, pas la date de mise en ligne.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => setDraft({})}
          >
            Réinitialiser
          </Button>
          <Button className="h-11 flex-1 rounded-xl" onClick={onApply}>
            Appliquer
          </Button>
        </div>
      </div>
    </SheetContent>
  );
}

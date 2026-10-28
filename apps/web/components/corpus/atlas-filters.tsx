"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  entityLabels,
  familyLabels,
  relationshipLabels,
} from "@/lib/corpus/labels";

const FILTER_KEYS = ["family", "year", "kind", "relationship", "orphans"];
function activeFilters(search: Pick<URLSearchParams, "get">) {
  const labels: Record<string, Record<string, string>> = {
    family: familyLabels,
    kind: entityLabels,
    relationship: relationshipLabels,
  };
  return ["q", ...FILTER_KEYS].flatMap((key) => {
    const value = search.get(key);
    if (!value || value === "all" || (key === "orphans" && value !== "true"))
      return [];
    return [
      {
        key,
        label:
          key === "q"
            ? `Recherche : ${value}`
            : key === "orphans"
              ? "Sans connexion inclus"
              : (labels[key]?.[value] ?? value),
      },
    ];
  });
}

export function AtlasFilterChips({
  search,
  update,
}: {
  search: Pick<URLSearchParams, "get">;
  update: (changes: Record<string, string>) => void;
}) {
  return (
    <div className="atlas-map-chips" aria-label="Critères actifs">
      {activeFilters(search).map(({ key, label }) => (
        <button
          key={key}
          onClick={() => update({ [key]: "" })}
          aria-label={`Retirer le filtre : ${label}`}
          title={label}
        >
          <span>{label}</span>
          <X size={13} aria-hidden />
        </button>
      ))}
    </div>
  );
}

export function AtlasFilters({
  search,
  view,
  mobile,
  open,
  onOpenChange,
  update,
  boundary,
}: {
  search: Pick<URLSearchParams, "get">;
  view: string;
  mobile: boolean;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  update: (changes: Record<string, string>) => void;
  boundary: HTMLElement | null;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const count = activeFilters(search).filter(
    (filter) => filter.key !== "q",
  ).length;
  function changeOpen(value: boolean) {
    if (value)
      setDraft(
        Object.fromEntries(
          FILTER_KEYS.map((key) => [key, search.get(key) ?? ""]),
        ),
      );
    onOpenChange(value);
  }
  const trigger = (
    <Button
      variant="outline"
      className="atlas-map-filter-trigger"
      aria-label={count ? `Filtres, ${count} actifs` : "Filtres"}
    >
      <SlidersHorizontal size={17} />
      <span>Filtres</span>
      {count > 0 && <b>{count}</b>}
    </Button>
  );
  const fields: {
    key: string;
    label: string;
    options: Record<string, string>;
  }[] = [
    { key: "family", label: "Collection", options: familyLabels },
    { key: "kind", label: "Type d’entité", options: entityLabels },
    ...(view === "relations"
      ? [
          {
            key: "relationship",
            label: "Relation",
            options: relationshipLabels,
          },
        ]
      : []),
  ];
  const form = (
    <form
      className="atlas-map-filter-form"
      onSubmit={(event) => {
        event.preventDefault();
        update(
          Object.fromEntries(
            FILTER_KEYS.map((key) => [
              key,
              draft[key] === "all" ? "" : (draft[key] ?? ""),
            ]),
          ),
        );
        changeOpen(false);
      }}
    >
      {fields.map(({ key, label, options }) => (
        <div key={key}>
          <label htmlFor={`atlas-${key}`}>{label}</label>
          <Select
            value={draft[key] || "all"}
            onValueChange={(value) =>
              value && setDraft({ ...draft, [key]: value })
            }
          >
            <SelectTrigger id={`atlas-${key}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tout afficher</SelectItem>
              {Object.entries(options).map(([value, title]) => (
                <SelectItem value={value} key={value}>
                  {title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
        <Button type="button" variant="outline" onClick={() => setDraft({})}>
          Réinitialiser
        </Button>
        <Button type="submit" className="flex-1">
          Appliquer
        </Button>
      </div>
    </form>
  );
  if (mobile)
    return (
      <Sheet open={open} onOpenChange={changeOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>
        <SheetContent side="bottom" className="atlas-map-mobile-sheet">
          <SheetHeader>
            <SheetTitle>Votre angle d’exploration</SheetTitle>
            <SheetDescription>
              Les filtres s’appliquent à tout le corpus.
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="atlas-map-filter-scroll">{form}</ScrollArea>
        </SheetContent>
      </Sheet>
    );
  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={10}
        collisionBoundary={boundary}
        collisionPadding={16}
        container={boundary}
        className="atlas-map-filter-popover"
        aria-labelledby="atlas-filters-title"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="atlas-filters-title" className="font-display font-semibold">
            Votre angle d’exploration
          </h2>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Fermer les filtres"
            onClick={() => changeOpen(false)}
          >
            <X size={16} />
          </Button>
        </div>
        <p className="mb-4 text-caption text-ink-muted">
          Les filtres s’appliquent à tout le corpus.
        </p>
        <ScrollArea className="atlas-map-filter-scroll">{form}</ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

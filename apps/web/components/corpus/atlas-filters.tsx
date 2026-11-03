"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ATLAS_FILTER_KEYS, activeAtlasFilters } from "@/lib/corpus/filters";
import { AtlasFilterFields } from "./atlas-filter-fields";

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
  const count = activeAtlasFilters(search).filter(
    (filter) => filter.key !== "q",
  ).length;
  function changeOpen(value: boolean) {
    if (value)
      setDraft(
        Object.fromEntries(
          ATLAS_FILTER_KEYS.map((key) => [key, search.get(key) ?? ""]),
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
  const form = (
    <AtlasFilterFields
      draft={draft}
      setDraft={setDraft}
      view={view}
      onSubmit={(changes) => {
        update(changes);
        changeOpen(false);
      }}
      onReset={() => setDraft({})}
    />
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

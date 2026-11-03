"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  ArrowRight,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { isActiveFilterValue, sortOptions } from "@/lib/corpus/filters";
import { applySearchChanges } from "@/lib/corpus/query";
import type { Facets } from "@/lib/corpus/types";
import { SearchChips } from "./search-chips";
import { SearchFilterSheet } from "./search-filter-sheet";

export function CorpusSearchForm({
  query,
  facets,
  entities = false,
}: {
  query: Record<string, string>;
  facets: Facets;
  entities?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [filters, setFilters] = useState(query);
  const [draft, setDraft] = useState(query);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(query.q ?? "");
  const base = entities ? "/brh-corpus/entities" : "/brh-corpus";
  const activeCount = [filters.family, filters.year, filters.kind].filter(
    isActiveFilterValue,
  ).length;
  const sort = sortOptions();
  function navigate(next: Record<string, string>) {
    const params = applySearchChanges(query, next, {
      dropPage: true,
      dropBlank: true,
    });
    start(() => router.push(`${base}?${params}`, { scroll: false }));
  }
  function removeFilter(key: string) {
    setFilters({ ...filters, [key]: "" });
    navigate({ ...filters, [key]: "", q: text });
  }
  return (
    <div className="atlas-search-area" aria-busy={pending}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigate({ ...filters, q: text });
        }}
        className="atlas-search-box"
        aria-label={
          entities ? "Rechercher une entité" : "Rechercher dans le corpus"
        }
      >
        <Search size={21} className="shrink-0 text-ink-muted" aria-hidden />
        <label className="sr-only" htmlFor="atlas-search">
          Rechercher
        </label>
        <input
          id="atlas-search"
          name="q"
          maxLength={300}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            entities
              ? "Institution, personne, indicateur…"
              : "Un titre, une référence, une question…"
          }
        />
        <Button
          type="submit"
          disabled={pending}
          className="h-11 rounded-xl px-3 sm:px-5"
          aria-label="Rechercher"
        >
          {pending ? (
            <LoaderCircle className="animate-spin" size={18} />
          ) : (
            <ArrowRight size={19} />
          )}
          <span className="hidden sm:inline">Rechercher</span>
        </Button>
      </form>
      <div className="atlas-search-options">
        {!entities && (
          <div className="atlas-segment" role="group" aria-label="Cible de recherche">
            {[
              ["metadata", "Publications"],
              ["text", "Passages"],
              ["semantic", "Par sens"],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                aria-pressed={(filters.mode || "metadata") === value}
                onClick={() => {
                  setFilters({ ...filters, mode: value });
                  navigate({ ...filters, mode: value, q: text });
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Sheet
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (v) setDraft(filters);
            }}
          >
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="corpus-filter-sheet-trigger h-11 rounded-xl"
              >
                <SlidersHorizontal size={16} />
                Filtres
                {activeCount > 0 && (
                  <span aria-label="Filtres actifs">{activeCount}</span>
                )}
              </Button>
            </SheetTrigger>
            <SearchFilterSheet
              entities={entities}
              facets={facets}
              draft={draft}
              setDraft={setDraft}
              onApply={() => {
                setFilters(draft);
                setOpen(false);
                navigate({
                  family: "",
                  year: "",
                  kind: "",
                  ...draft,
                  q: text,
                });
              }}
            />
          </Sheet>
          {!entities && (
            <Select
              value={filters.sort || "recent"}
              onValueChange={(v) => {
                if (v) {
                  setFilters({ ...filters, sort: v });
                  navigate({ ...filters, sort: v, q: text });
                }
              }}
            >
              <SelectTrigger
                aria-label="Trier les publications"
                className="flex h-11 w-40 rounded-lg"
              >
                <SelectValue>
                  {
                    sort.find(
                      (option) => option.value === (filters.sort || "recent"),
                    )?.label
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sort.map((option) => (
                  <SelectItem value={option.value} key={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      <SearchChips filters={filters} onRemove={removeFilter} />
      <span className="sr-only" role="status">
        {pending ? "Recherche en cours" : ""}
      </span>
    </div>
  );
}

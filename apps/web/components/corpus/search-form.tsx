"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  ArrowRight,
  LoaderCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { familyLabels, entityLabels } from "@/lib/corpus/labels";
import type { Facets } from "@/lib/corpus/types";

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
  function navigate(next: Record<string, string>) {
    const p = new URLSearchParams({ ...query, ...next });
    p.delete("page");
    [...p].forEach(([k, v]) => {
      if (!v || v === "all") p.delete(k);
    });
    start(() => router.push(`${base}?${p}`, { scroll: false }));
  }
  function fields(
    values: Record<string, string>,
    set: (v: Record<string, string>) => void,
    prefix: string,
  ) {
    const options: [string, string, [string, string][]][] = entities
      ? [["kind", "Type d’entité", Object.entries(entityLabels)]]
      : [
          [
            "family",
            "Collection",
            facets.families.map((f) => [
              f.family,
              `${familyLabels[f.family] ?? f.family} (${f.count})`,
            ]),
          ],
          [
            "year",
            "Période couverte",
            facets.years.map((y) => [String(y), String(y)]),
          ],
        ];
    return (
      <div className="space-y-5">
        {options.map(([key, label, items]) => (
          <div key={key}>
            <label
              className="mb-2 block text-small font-medium"
              htmlFor={`${prefix}-${key}`}
            >
              {label}
            </label>
            <Select
              value={values[key] || "all"}
              onValueChange={(v) => v && set({ ...values, [key]: v })}
            >
              <SelectTrigger
                id={`${prefix}-${key}`}
                className="h-11 w-full rounded-xl"
              >
                <SelectValue>
                  {items.find(([value]) => value === values[key])?.[1] ??
                    "Tout afficher"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tout afficher</SelectItem>
                {items.map(([v, l]) => (
                  <SelectItem value={v} key={v}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        <p className="text-caption leading-5 text-ink-muted">
          La période décrit le contenu, pas la date de mise en ligne.
        </p>
      </div>
    );
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
          <div className="atlas-segment" aria-label="Cible de recherche">
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
              <Button variant="outline" className="h-11 rounded-xl">
                <SlidersHorizontal size={16} />
                Filtres
                {[filters.family, filters.year, filters.kind].filter(
                  (v) => v && v !== "all",
                ).length > 0 && <span className="atlas-filter-dot" />}
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-full overflow-y-auto sm:max-w-md"
            >
              <SheetHeader>
                <SheetTitle>Affiner votre exploration</SheetTitle>
                <SheetDescription>
                  Choisissez les critères, puis appliquez-les.
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-7 px-5">
                {fields(draft, setDraft, "sheet")}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl"
                    onClick={() => setDraft({})}
                  >
                    Réinitialiser
                  </Button>
                  <Button
                    className="h-11 flex-1 rounded-xl"
                    onClick={() => {
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
                  >
                    Appliquer
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          {!entities && (
            <Select
              value={filters.sort || "title"}
              onValueChange={(v) => {
                if (v) {
                  setFilters({ ...filters, sort: v });
                  navigate({ ...filters, sort: v, q: text });
                }
              }}
            >
              <SelectTrigger
                aria-label="Trier les publications"
                className="hidden h-11 w-44 rounded-xl sm:flex"
              >
                <SelectValue>
                  {
                    {
                      title: "Titre A–Z",
                      period: "Période récente",
                      recent: "Ajouts récents",
                    }[filters.sort || "title"]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Titre A–Z</SelectItem>
                <SelectItem value="period">Période récente</SelectItem>
                <SelectItem value="recent">Ajouts récents</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {["family", "year", "kind", "entity_id", "document_id"]
          .filter((k) => filters[k] && filters[k] !== "all")
          .map((k) => (
            <button
              type="button"
              className="atlas-chip"
              key={k}
              onClick={() => {
                setFilters({ ...filters, [k]: "" });
                navigate({ ...filters, [k]: "", q: text });
              }}
            >
              {k === "family"
                ? (familyLabels[filters[k]] ?? filters[k])
                : k === "kind"
                  ? (entityLabels[filters[k]] ?? filters[k])
                  : k.endsWith("_id")
                    ? k === "entity_id"
                      ? "Entité sélectionnée"
                      : "Document sélectionné"
                    : filters[k]}
              <X size={13} />
              <span className="sr-only">Retirer le filtre</span>
            </button>
          ))}
      </div>
      <span className="sr-only" role="status">
        {pending ? "Recherche en cours" : ""}
      </span>
    </div>
  );
}

export function CorpusFilterSidebar({
  query,
  facets,
}: {
  query: Record<string, string>;
  facets: Facets;
}) {
  const [open, setOpen] = useState(true);
  const [values, setValues] = useState(query);
  return (
    <aside
      className={`atlas-filter-sidebar ${open ? "" : "is-closed"}`}
      aria-label="Filtres des publications"
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? "Réduire les filtres" : "Afficher les filtres"}
        className="flex min-h-11 w-full items-center justify-between gap-2 text-small font-semibold"
      >
        <SlidersHorizontal size={17} />
        {open && (
          <>
            Affiner
            <X size={15} />
          </>
        )}
      </button>
      {open && (
        <form action="/brh-corpus" method="get" className="mt-6 space-y-5">
          {["q", "mode", "entity_id", "document_id", "sort"].map((k) =>
            query[k] ? (
              <input key={k} type="hidden" name={k} value={query[k]} />
            ) : null,
          )}
          {[
            [
              "family",
              "Collection",
              facets.families.map((f) => [
                f.family,
                `${familyLabels[f.family] ?? f.family} (${f.count})`,
              ]),
            ],
            [
              "year",
              "Période couverte",
              facets.years.map((y) => [String(y), String(y)]),
            ],
          ].map(([key, label, options]) => (
            <div key={String(key)}>
              <label
                htmlFor={`sidebar-${key}`}
                className="mb-2 block text-caption text-ink-muted"
              >
                {String(label)}
              </label>
              <input
                type="hidden"
                name={String(key)}
                value={
                  values[String(key)] === "all"
                    ? ""
                    : (values[String(key)] ?? "")
                }
              />
              <Select
                value={values[String(key)] || "all"}
                onValueChange={(v) =>
                  v && setValues({ ...values, [String(key)]: v })
                }
              >
                <SelectTrigger
                  id={`sidebar-${key}`}
                  className="h-11 w-full min-w-0 rounded-xl"
                >
                  <SelectValue>
                    {(options as string[][]).find(
                      ([value]) => value === values[String(key)],
                    )?.[1] ?? "Tout afficher"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tout afficher</SelectItem>
                  {(options as string[][]).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <Button
            type="submit"
            variant="outline"
            className="h-11 w-full rounded-xl"
          >
            Appliquer
          </Button>
          <a
            href="/brh-corpus"
            className="block py-3 text-center text-caption text-teal"
          >
            Tout réinitialiser
          </a>
          <p className="border-t border-border pt-5 text-caption leading-6 text-ink-muted">
            Un document, son contexte, sa source. Les périodes inconnues restent
            visibles sans filtre.
          </p>
        </form>
      )}
    </aside>
  );
}

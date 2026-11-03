"use client";
import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  ArrowRight,
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
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
              <Button
                variant="outline"
                className="corpus-filter-sheet-trigger h-11 rounded-xl"
              >
                <SlidersHorizontal size={16} />
                Filtres
                {[filters.family, filters.year, filters.kind].filter(
                  (v) => v && v !== "all",
                ).length > 0 && (
                  <span aria-label="Filtres actifs">
                    {
                      [filters.family, filters.year, filters.kind].filter(
                        (v) => v && v !== "all",
                      ).length
                    }
                  </span>
                )}
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
                    {
                      title: "Titre A à Z",
                      period: "Période récente",
                      recent: "Ajouts récents",
                    }[filters.sort || "recent"]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="title">Titre A à Z</SelectItem>
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
  const reducedMotion = useReducedMotion();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(true);
  const [values, setValues] = useState(query);
  const activeCount = ["family", "year"].filter(
    (key) => values[key] && values[key] !== "all",
  ).length;
  const resetParams = new URLSearchParams(query);
  resetParams.delete("family");
  resetParams.delete("year");
  resetParams.delete("page");
  const resetHref = `/brh-corpus${resetParams.size ? `?${resetParams}` : ""}`;
  function applyFilter(key: "family" | "year", value: string) {
    const next = new URLSearchParams(query);
    next.delete("page");
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    startTransition(() =>
      router.push(`/brh-corpus${next.size ? `?${next}` : ""}`, {
        scroll: false,
      }),
    );
  }
  return (
    <aside
      className={`atlas-filter-sidebar ${open ? "" : "is-closed"}`}
      aria-label="Filtres des publications"
      aria-busy={pending}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? "Réduire les filtres" : "Afficher les filtres"}
        className="corpus-filter-sidebar-toggle"
      >
        {open ? (
          <>
            <span className="corpus-filter-sidebar-title">
              <SlidersHorizontal size={18} aria-hidden />
              <span>Filtres</span>
              {activeCount > 0 && (
                <span
                  className="corpus-filter-count"
                  aria-label={`${activeCount} filtres actifs`}
                >
                  {activeCount}
                </span>
              )}
            </span>
            {pending ? (
              <LoaderCircle className="animate-spin" size={18} aria-hidden />
            ) : (
              <PanelLeftClose size={18} aria-hidden />
            )}
          </>
        ) : (
          <PanelLeftOpen size={19} aria-hidden />
        )}
      </button>
      <AnimatePresence initial={false} mode="popLayout">
        {open && (
          <motion.form
            key="filter-fields"
            action="/brh-corpus"
            method="get"
            className="corpus-filter-form"
            initial={{ opacity: 0, x: reducedMotion ? 0 : -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reducedMotion ? 0 : -8 }}
            transition={{
              duration: reducedMotion ? 0 : 0.16,
              ease: [0.2, 0, 0, 1],
            }}
          >
            <p className="corpus-filter-intro">
              Les résultats s’actualisent dès qu’un filtre est choisi.
            </p>
            {["q", "mode", "entity_id", "document_id", "sort"].map((k) =>
              query[k] ? (
                <input key={k} type="hidden" name={k} value={query[k]} />
              ) : null,
            )}
            <fieldset className="corpus-filter-field">
              <legend className="corpus-filter-label">Collection</legend>
              <div className="corpus-filter-options">
                <label className="corpus-filter-option">
                  <input
                    type="radio"
                    name="family"
                    value=""
                    checked={!values.family || values.family === "all"}
                    onChange={() => {
                      setValues({ ...values, family: "" });
                      applyFilter("family", "");
                    }}
                  />
                  <span>Toutes les collections</span>
                </label>
                {facets.families.map((family) => (
                  <label className="corpus-filter-option" key={family.family}>
                    <input
                      type="radio"
                      name="family"
                      value={family.family}
                      checked={values.family === family.family}
                      onChange={() => {
                        setValues({ ...values, family: family.family });
                        applyFilter("family", family.family);
                      }}
                    />
                    <span>{familyLabels[family.family] ?? family.family}</span>
                    <span className="corpus-filter-option-count">
                      {family.count}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="corpus-filter-field">
              <label htmlFor="sidebar-year" className="corpus-filter-label">
                Période couverte
              </label>
              <input
                type="hidden"
                name="year"
                value={values.year === "all" ? "" : (values.year ?? "")}
              />
              <Select
                value={values.year || "all"}
                onValueChange={(year) => {
                  if (!year) return;
                  setValues({ ...values, year });
                  applyFilter("year", year);
                }}
              >
                <SelectTrigger
                  id="sidebar-year"
                  className="corpus-filter-select h-11 w-full min-w-0 rounded-lg"
                >
                  <SelectValue>
                    {values.year && values.year !== "all"
                      ? values.year
                      : "Toutes les périodes"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les périodes</SelectItem>
                  {facets.years.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {activeCount > 0 && (
              <a href={resetHref} className="corpus-filter-reset">
                Réinitialiser les filtres
              </a>
            )}
            <p className="corpus-filter-note">
              La période décrit le contenu du document. Les dates inconnues
              restent visibles tant qu’aucune période n’est choisie.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </aside>
  );
}

"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  LoaderCircle,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
} from "lucide-react";
import { feedbackTransition } from "@/lib/motion";
import {
  familyOptions,
  isActiveFilterValue,
  yearOptions,
} from "@/lib/corpus/filters";
import { applySearchChanges } from "@/lib/corpus/query";
import type { Facets } from "@/lib/corpus/types";
import { FilterSelect } from "./filter-select";

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
  const activeCount = ["family", "year"].filter((key) =>
    isActiveFilterValue(values[key]),
  ).length;
  const resetParams = new URLSearchParams(query);
  resetParams.delete("family");
  resetParams.delete("year");
  resetParams.delete("page");
  const resetHref = `/brh-corpus${resetParams.size ? `?${resetParams}` : ""}`;
  function applyFilter(key: "family" | "year", value: string) {
    const next = applySearchChanges(
      query,
      { [key]: isActiveFilterValue(value) ? value : "" },
      { dropPage: true },
    );
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
              ...feedbackTransition,
              duration: reducedMotion ? 0 : feedbackTransition.duration,
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
                {familyOptions(facets).map((family) => (
                  <label className="corpus-filter-option" key={family.value}>
                    <input
                      type="radio"
                      name="family"
                      value={family.value}
                      checked={values.family === family.value}
                      onChange={() => {
                        setValues({ ...values, family: family.value });
                        applyFilter("family", family.value);
                      }}
                    />
                    <span>{family.label}</span>
                    <span className="corpus-filter-option-count">
                      {family.count}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <input
              type="hidden"
              name="year"
              value={values.year === "all" ? "" : (values.year ?? "")}
            />
            <FilterSelect
              id="sidebar-year"
              label="Période couverte"
              value={values.year ?? ""}
              options={yearOptions(facets)}
              onValueChange={(year) => {
                setValues({ ...values, year });
                applyFilter("year", year);
              }}
              allLabel="Toutes les périodes"
              displayValue={
                values.year && values.year !== "all"
                  ? values.year
                  : "Toutes les périodes"
              }
              labelClassName="corpus-filter-label"
              wrapperClassName="corpus-filter-field"
              triggerClassName="corpus-filter-select h-11 w-full min-w-0 rounded-lg"
            />
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

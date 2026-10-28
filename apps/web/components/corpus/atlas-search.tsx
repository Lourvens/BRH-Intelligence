"use client";

import { useEffect, useState } from "react";
import { ArrowRight, FileText, Network, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { entityLabels } from "@/lib/corpus/labels";
import type { AtlasGraph } from "@/lib/corpus/types";

export function AtlasSearch({
  query,
  data,
  pending,
  submit,
  choose,
}: {
  query: string;
  data: AtlasGraph | undefined;
  pending: boolean;
  submit: (value: string) => void;
  choose: (id: string) => void;
}) {
  const [value, setValue] = useState(query);
  const [resultsOpen, setResultsOpen] = useState(false);
  useEffect(() => setValue(query), [query]);
  const results = query && !pending ? data?.nodes.slice(0, 6) : undefined;
  return (
    <div className="atlas-map-search">
      <form
        className="atlas-search-box"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit(value.trim());
          setResultsOpen(true);
        }}
      >
        <Search size={18} aria-hidden />
        <label className="sr-only" htmlFor="graph-search">
          Rechercher dans tout le graphe
        </label>
        <input
          id="graph-search"
          value={value}
          maxLength={300}
          onChange={(event) => setValue(event.target.value)}
          onFocus={() => setResultsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setResultsOpen(false);
            }
          }}
          placeholder="Document, institution, lieu…"
        />
        <Button
          size="icon"
          type="submit"
          aria-label="Rechercher dans le graphe"
          disabled={pending}
        >
          <ArrowRight size={17} />
        </Button>
      </form>
      {resultsOpen && query && (
        <section
          className="atlas-map-results"
          aria-label="Résultats de recherche"
        >
          <ScrollArea
            className="atlas-map-results-scroll"
            style={{
              height: `min(${Math.min(440, (results?.length ?? 0) * 76 + 120)}px, max(100px, calc(100dvh - 280px)))`,
            }}
          >
            <div className="atlas-map-results-content">
              <div className="flex items-center justify-between gap-2">
                <p className="atlas-kicker">
                  {pending ? "Recherche…" : "Points de départ"}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Masquer les résultats"
                  onClick={() => setResultsOpen(false)}
                >
                  <X size={16} />
                </Button>
              </div>
              {results?.map((node) => (
                <button
                  className="atlas-map-result"
                  key={node.id}
                  onClick={() => {
                    choose(node.id);
                    setResultsOpen(false);
                  }}
                >
                  {node.kind === "document" ? (
                    <FileText size={16} />
                  ) : (
                    <Network size={16} />
                  )}
                  <span>
                    {node.label}
                    <small>{entityLabels[node.kind] ?? "Publication"}</small>
                  </span>
                  <ArrowRight size={14} />
                </button>
              ))}
              {!pending && !results?.length && (
                <p className="py-3 text-small text-ink-muted">
                  Aucun résultat. Essayez un terme plus large.
                </p>
              )}
              {!!results?.length && (
                <p className="pt-3 text-caption text-ink-muted">
                  Sélectionnez un résultat pour explorer ses connexions.
                </p>
              )}
            </div>
          </ScrollArea>
        </section>
      )}
    </div>
  );
}

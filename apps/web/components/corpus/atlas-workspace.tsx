"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Info, LoaderCircle, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { entityLabels } from "@/lib/corpus/labels";
import { ATLAS_KIND_TOKENS } from "@/lib/corpus/atlas-palette";
import { AtlasCanvasTools } from "./atlas-canvas-tools";
import { AtlasFilterChips, AtlasFilters } from "./atlas-filters";
import { AtlasGraphList } from "./atlas-graph-list";
import { AtlasInspector } from "./atlas-inspector";
import { AtlasSearch } from "./atlas-search";
import { AtlasViewControls } from "./atlas-view-controls";
import { useAtlasWorkspace } from "./use-atlas-workspace";
import type { AtlasControls } from "./atlas-network";

const Canvas = dynamic(() => import("./atlas-network"), {
  ssr: false,
  loading: () => (
    <div className="atlas-map-message" role="status">
      <LoaderCircle className="animate-spin" />
      Préparation de la carte…
    </div>
  ),
});

export function AtlasWorkspace() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={300}>
        <Workspace />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function Workspace() {
  const {
    search,
    graph,
    mobile,
    selected,
    list,
    view,
    fallbackFocus,
    update,
    choose,
    close,
    restoreFocus,
    toggleList,
    reset,
  } = useAtlasWorkspace();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [boundary, setBoundary] = useState<HTMLElement | null>(null);
  const controls = useRef<AtlasControls>(null);
  const reduced = useReducedMotion();
  const inspectorRef = useRef<HTMLElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const data = graph.data;
  const selectedExists =
    !!data &&
    (data.nodes.some((node) => node.id === selected) ||
      data.edges.some((edge) => edge.id === selected));
  const showInspector = !!selected && selectedExists;

  useEffect(() => {
    const element = exploreRef.current;
    if (!element || !boundary) return;
    const observer = new ResizeObserver(() => {
      boundary.style.setProperty(
        "--map-tools-height",
        `${element.offsetHeight}px`,
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [boundary]);
  useEffect(() => {
    if (!showInspector || mobile !== false) return;
    inspectorRef.current?.focus({ preventScroll: true });
  }, [selected, showInspector, mobile]);
  useEffect(() => {
    if (!fullscreen) return;
    const previous = document.body.style.overflow;
    const header = document.querySelector<HTMLElement>(".research-header");
    const wasInert = header?.inert ?? false;
    document.body.style.overflow = "hidden";
    if (header) header.inert = true;
    return () => {
      document.body.style.overflow = previous;
      if (header) header.inert = wasInert;
    };
  }, [fullscreen]);
  function dismissInspector() {
    close();
    restoreFocus();
  }
  useEffect(() => {
    function escape(event: KeyboardEvent) {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        filtersOpen ||
        (mobile && showInspector)
      )
        return;
      if (showInspector && !mobile) {
        event.preventDefault();
        dismissInspector();
      } else if (fullscreen) setFullscreen(false);
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  });
  const inspector = (
    <AtlasInspector
      key={selected}
      data={data}
      selected={selected}
      choose={choose}
      update={update}
      close={dismissInspector}
    />
  );

  return (
    <section
      ref={setBoundary}
      className={`atlas-graph-page atlas-map ${fullscreen ? "is-fullscreen" : ""} ${showInspector && !mobile ? "has-inspector" : ""}`}
      aria-label="Atlas des connaissances"
    >
      <h1 className="sr-only">Atlas des connaissances</h1>
      <div className="atlas-graph-workspace">
        <div className="atlas-graph-stage" aria-busy={graph.isFetching}>
          {data && data.nodes.length > 0 && (
            <>
              <div className="atlas-map-canvas" hidden={list}>
                <Canvas
                  ref={controls}
                  data={data}
                  selected={selected}
                  onSelect={choose}
                />
              </div>
              {list && (
                <AtlasGraphList
                  data={data}
                  selected={selected}
                  choose={choose}
                />
              )}
            </>
          )}
          {graph.isError ? (
            <div className="atlas-map-message" role="alert">
              <Network size={32} />
              <h2>Le graphe est temporairement indisponible.</h2>
              <p>Vos critères sont conservés. Vous pouvez réessayer.</p>
              <Button onClick={() => graph.refetch()}>Réessayer</Button>
            </div>
          ) : graph.isPending ? (
            <div className="atlas-map-message" role="status">
              <LoaderCircle className="animate-spin" />
              <h2>Assemblage des connexions…</h2>
            </div>
          ) : data?.nodes.length === 0 ? (
            <div className="atlas-map-message">
              <Network size={36} />
              <h2>
                {search.get("q") || search.get("focus")
                  ? "Aucune connexion pour ces critères"
                  : "Les liens se dessinent à partir des sources."}
              </h2>
              <p>
                {view === "relations"
                  ? "Aucune relation documentée ne correspond à cette vue. Explorez aussi les mentions dans les publications."
                  : "Élargissez les filtres ou revenez à la vue globale."}
              </p>
              <Button variant="outline" onClick={reset}>
                Vue globale
              </Button>
              <Link
                href="/brh-corpus"
                className="text-small text-teal underline"
              >
                Explorer les publications
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <div ref={exploreRef} className="atlas-map-explore">
        <AtlasSearch
          query={search.get("q") ?? ""}
          data={data}
          pending={graph.isFetching}
          submit={(q) => update({ q, focus: "" })}
          choose={(id) => update({ focus: id, q: "", hops: "1", selected: id })}
        />
        <div className="atlas-map-toolbar">
          <AtlasFilters
            search={search}
            view={view}
            mobile={!!mobile}
            open={filtersOpen}
            onOpenChange={(open) => {
              if (open && mobile) close();
              setFiltersOpen(open);
            }}
            update={update}
            boundary={boundary}
          />
          <AtlasViewControls
            view={view}
            list={list}
            focus={search.get("focus") ?? ""}
            hops={search.get("hops") ?? "1"}
            update={update}
            toggleList={toggleList}
            listRef={fallbackFocus}
          />
        </div>
        <AtlasFilterChips search={search} update={update} />
      </div>

      <AnimatePresence initial={false}>
        {showInspector && mobile === false && (
          <motion.aside
            key="inspector"
            ref={inspectorRef}
            tabIndex={-1}
            className="atlas-map-inspector"
            aria-label="Détails et sources de la sélection"
            initial={reduced ? false : { opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduced ? 0 : 12 }}
            transition={{ duration: 0.18 }}
          >
            {inspector}
          </motion.aside>
        )}
      </AnimatePresence>
      <Sheet
        open={!!mobile && showInspector && !filtersOpen}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          className="atlas-map-mobile-sheet atlas-map-detail-sheet"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus();
          }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Contexte du graphe</SheetTitle>
            <SheetDescription>
              Connexions et preuves documentaires
            </SheetDescription>
          </SheetHeader>
          {inspector}
        </SheetContent>
      </Sheet>

      {!list && !!data?.nodes.length && (
        <details className="atlas-graph-legend">
          <summary aria-label="Légende du graphe">
            <Info size={16} className="atlas-map-legend-icon" aria-hidden />
            <span className="atlas-map-legend-label">Légende</span>
          </summary>
          <ScrollArea className="atlas-map-legend-scroll">
            <div className="atlas-legend-items">
              {[...new Set(data.nodes.map((node) => node.kind))]
                .sort()
                .map((kind) => (
                  <span key={kind}>
                    <i
                      style={{
                        backgroundColor: `var(${ATLAS_KIND_TOKENS[kind] ?? "--color-teal"})`,
                        borderRadius: kind === "document" ? 2 : "50%",
                      }}
                    />
                    {kind === "document"
                      ? "Documents"
                      : (entityLabels[kind] ?? kind)}
                  </span>
                ))}
            </div>
            <p>
              {view === "mentions"
                ? "┄ Mentions dans les publications"
                : "→ Relations documentées"}
            </p>
          </ScrollArea>
        </details>
      )}
      <div className="atlas-map-status" role="status" aria-live="polite">
        {graph.isFetching && (
          <LoaderCircle size={13} className="animate-spin shrink-0" />
        )}
        <span>
          {data
            ? `${data.displayed_nodes} / ${data.matching_nodes} nœuds · ${data.displayed_edges} / ${data.matching_edges} liens`
            : "Carte des connaissances BRH"}
          {data?.truncated && (
            <small>Vue partielle · Affinez ou explorez autour d’un nœud.</small>
          )}
        </span>
      </div>
      <AtlasCanvasTools
        controls={controls}
        fullscreen={fullscreen}
        toggleFullscreen={() => setFullscreen(!fullscreen)}
        reset={() => {
          reset();
          controls.current?.fit();
        }}
        disabled={list || !data?.nodes.length || graph.isPending}
      />
    </section>
  );
}

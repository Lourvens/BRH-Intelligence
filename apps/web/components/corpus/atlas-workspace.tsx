"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAtlasMapEffects } from "@/lib/hooks/use-atlas-map-effects";
import { useAtlasWorkspace } from "@/lib/hooks/use-atlas-workspace";
import { AtlasCanvasTools } from "./atlas-canvas-tools";
import { AtlasFilterChips } from "./atlas-filter-chips";
import { AtlasFilters } from "./atlas-filters";
import { AtlasInspector } from "./atlas-inspector";
import { AtlasMapLegend } from "./atlas-map-legend";
import { AtlasMapStage } from "./atlas-map-stage";
import { AtlasMapStatus } from "./atlas-map-status";
import { AtlasSearch } from "./atlas-search";
import { AtlasViewControls } from "./atlas-view-controls";
import { AtlasWorkspaceProviders } from "./atlas-workspace-providers";
import type { AtlasControls } from "./atlas-network";

export function AtlasWorkspace() {
  return (
    <AtlasWorkspaceProviders>
      <Workspace />
    </AtlasWorkspaceProviders>
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
  function dismissInspector() {
    close();
    restoreFocus();
  }
  const { fullscreen, setFullscreen } = useAtlasMapEffects({
    boundary,
    exploreRef,
    inspectorRef,
    selected,
    showInspector,
    mobile,
    filtersOpen,
    onDismissInspector: dismissInspector,
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
      <AtlasMapStage
        data={data}
        fetching={graph.isFetching}
        error={graph.error}
        pending={graph.isPending}
        refetch={() => graph.refetch()}
        search={search}
        view={view}
        list={list}
        selected={selected}
        choose={choose}
        reset={reset}
        controls={controls}
      />

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
            transition={{ duration: reduced ? 0 : 0.18 }}
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
        <AtlasMapLegend data={data} view={view} />
      )}
      <AtlasMapStatus fetching={graph.isFetching} data={data} />
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

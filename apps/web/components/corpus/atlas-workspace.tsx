"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { Group, Panel, Separator } from "react-resizable-panels";
import {
  Network,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  Plus,
  Minus,
  Maximize,
  List,
  LoaderCircle,
  FileText,
  ArrowRight,
  RotateCcw,
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
} from "@/components/ui/sheet";
import { AtlasInspector } from "./atlas-inspector";
import { readAtlas } from "./atlas-data";
import {
  entityLabels,
  familyLabels,
  relationshipLabels,
} from "@/lib/corpus/labels";
import { ATLAS_KIND_TOKENS } from "@/lib/corpus/atlas-palette";
import type { AtlasGraph } from "@/lib/corpus/types";
import type { AtlasControls } from "./atlas-network";
const Canvas = dynamic(() => import("./atlas-network"), {
  ssr: false,
  loading: () => (
    <div className="atlas-empty">
      <LoaderCircle className="animate-spin" />
      Préparation de la carte…
    </div>
  ),
});
const apiKeys = [
  "view",
  "q",
  "family",
  "year",
  "kind",
  "relationship",
  "focus",
  "hops",
  "orphans",
];
function useMobile(maxWidth = 1199) {
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const m = matchMedia(`(max-width: ${maxWidth}px)`);
    const change = () => setMobile(m.matches);
    change();
    m.addEventListener("change", change);
    return () => m.removeEventListener("change", change);
  }, [maxWidth]);
  return mobile;
}
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
      <Workspace />
    </QueryClientProvider>
  );
}
function Workspace() {
  const search = useSearchParams();
  const router = useRouter();
  const mobile = useMobile();
  const small = useMobile(767);
  const [q, setQ] = useState(search.get("q") ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [list, setList] = useState(search.get("display") === "list");
  const [selected, setSelected] = useState(search.get("selected") ?? "");
  const controls = useRef<AtlasControls>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const listToggle = useRef<HTMLButtonElement>(null);
  const view = search.get("view") === "relations" ? "relations" : "mentions";
  const params = new URLSearchParams();
  apiKeys.forEach((k) => {
    const v = search.get(k);
    if (v) params.set(k, v);
  });
  params.set("view", view);
  params.set("node_limit", small ? "120" : "300");
  params.set("edge_limit", small ? "240" : "600");
  const key = params.toString();
  const graph = useQuery({
    queryKey: ["atlas", key],
    queryFn: ({ signal }) =>
      readAtlas<AtlasGraph>(`/api/corpus/graph?${key}`, signal),
    enabled: mobile !== null && small !== null,
    placeholderData: keepPreviousData,
  });
  useEffect(() => {
    setQ(search.get("q") ?? "");
    setList(search.get("display") === "list");
    setSelected(search.get("selected") ?? "");
  }, [search]);
  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(search);
    Object.entries(changes).forEach(([k, v]) =>
      v ? next.set(k, v) : next.delete(k),
    );
    next.delete("selected");
    setSelected("");
    router.replace(`/brh-corpus/graph?${next}`, { scroll: false });
  }
  function choose(id: string) {
    if (!selected && document.activeElement instanceof HTMLElement)
      returnFocus.current = document.activeElement;
    setSelected(id);
    const next = new URLSearchParams(search);
    next.set("selected", id);
    history.replaceState(null, "", `?${next}`);
  }
  function close() {
    setSelected("");
    const p = new URLSearchParams(search);
    p.delete("selected");
    history.replaceState(null, "", `?${p}`);
  }
  const data = graph.data;
  const inspector = (
    <AtlasInspector
      key={selected}
      data={data}
      selected={selected}
      choose={choose}
      update={update}
      close={close}
    />
  );
  const stage = (
    <div className="atlas-graph-stage" aria-busy={graph.isFetching}>
      {graph.isError ? (
        <div className="atlas-empty" role="alert">
          <Network size={32} />
          <h3>La carte fait une pause.</h3>
          <p>{graph.error.message}</p>
          <Button onClick={() => graph.refetch()}>Réessayer</Button>
        </div>
      ) : graph.isPending ? (
        <div className="atlas-empty" role="status">
          <LoaderCircle className="animate-spin" />
          <h3>Assemblage des connexions…</h3>
        </div>
      ) : data && data.nodes.length === 0 ? (
        <div className="atlas-empty">
          <Network size={38} />
          <h3>
            {search.get("q") || search.get("focus")
              ? "Aucune connexion pour ces critères"
              : "Les liens se dessinent à partir des sources."}
          </h3>
          <p>
            {search.get("q") || search.get("focus")
              ? "Élargissez les filtres ou revenez à la vue globale."
              : "Les documents sont disponibles. Le graphe apparaîtra à mesure que leurs entités et relations seront extraites."}
          </p>
          <Button
            variant="outline"
            onClick={() => router.replace("/brh-corpus/graph")}
          >
            Vue globale
          </Button>
          <Link href="/brh-corpus" className="text-small text-teal underline">
            Explorer les publications
          </Link>
        </div>
      ) : (
        data && (
          <>
            {list ? (
              <div className="atlas-graph-list">
                <h2 className="mb-4 font-display text-lg font-semibold">
                  Nœuds affichés
                </h2>
                {data.nodes.map((n) => (
                  <button
                    key={n.id}
                    aria-pressed={selected === n.id}
                    onClick={() => choose(n.id)}
                  >
                    <span>
                      {n.kind === "document" ? (
                        <FileText className="mr-2 inline" size={15} />
                      ) : (
                        <Network className="mr-2 inline" size={15} />
                      )}{" "}
                      {n.label}
                      <small className="mt-1 block text-ink-muted">
                        {entityLabels[n.kind] ??
                          (n.kind === "document" ? "Publication" : n.kind)}
                      </small>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
                <h2 className="mb-3 mt-7 font-display text-lg font-semibold">
                  Liens et preuves
                </h2>
                {data.edges.map((e) => (
                  <button
                    key={e.id}
                    aria-pressed={selected === e.id}
                    onClick={() => choose(e.id)}
                  >
                    <span>
                      {data.nodes.find((n) => n.id === e.source)?.label}
                      <span className="block py-1 text-teal">
                        {relationshipLabels[e.label] ?? e.label} →
                      </span>
                      {data.nodes.find((n) => n.id === e.target)?.label}
                    </span>
                    <ArrowUpRight className="shrink-0" size={16} />
                  </button>
                ))}
              </div>
            ) : (
              <>
                <Canvas
                  ref={controls}
                  data={data}
                  selected={selected}
                  onSelect={choose}
                />
                <details className="atlas-graph-legend">
                  <summary>Types de nœuds</summary>
                  <div className="atlas-legend-items">
                    {[...new Set(data.nodes.map((n) => n.kind))]
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
                      ? "┄ Mentions documentaires"
                      : "→ Relations documentées"}
                  </p>
                </details>
                <div className="atlas-graph-controls">
                  <Button
                    variant="ghost"
                    aria-label="Zoom avant"
                    onClick={() => controls.current?.zoom(1.3)}
                  >
                    <Plus size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label="Zoom arrière"
                    onClick={() => controls.current?.zoom(0.77)}
                  >
                    <Minus size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label="Recentrer le graphe"
                    onClick={() => controls.current?.fit()}
                  >
                    <Maximize size={17} />
                  </Button>
                </div>
              </>
            )}
            {graph.isFetching && (
              <span
                role="status"
                className="absolute right-4 top-4 rounded-xl bg-surface px-3 py-2 text-caption shadow-card"
              >
                Mise à jour…
              </span>
            )}
          </>
        )
      )}
    </div>
  );
  return (
    <div className="atlas-graph-page">
      <header className="atlas-graph-header">
        <div>
          <p className="atlas-kicker mb-1">LES CONNAISSANCES EN MOUVEMENT</p>
          <h1>
            Tout est relié. <span className="text-teal">Explorez.</span>
          </h1>
        </div>
        <Button
          variant="outline"
          className="h-11 rounded-xl"
          ref={listToggle}
          aria-label={list ? "Afficher la carte" : "Afficher la liste"}
          aria-pressed={list}
          onClick={() => {
            const nextList = !list;
            setList(nextList);
            const next = new URLSearchParams(search);
            if (nextList) next.set("display", "list");
            else next.delete("display");
            history.replaceState(null, "", `?${next}`);
          }}
        >
          {list ? <Network size={16} /> : <List size={16} />}
          <span className="hidden sm:inline">{list ? "Carte" : "Liste"}</span>
        </Button>
      </header>
      <div className="atlas-graph-toolbar">
        <form
          className="atlas-search-box min-w-0 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            update({ q, focus: "" });
          }}
        >
          <Search size={17} />
          <label className="sr-only" htmlFor="graph-search">
            Rechercher dans tout le graphe
          </label>
          <input
            id="graph-search"
            value={q}
            maxLength={300}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Chercher un document, une entité…"
          />
          <Button
            size="sm"
            type="submit"
            aria-label="Rechercher dans le graphe"
          >
            <ArrowRight size={17} />
          </Button>
        </form>
        <Button
          variant="outline"
          className="h-12 rounded-xl"
          onClick={() => {
            setDraft(Object.fromEntries(search));
            setFiltersOpen(true);
          }}
        >
          <SlidersHorizontal size={17} />
          <span className="hidden sm:inline">Filtres</span>
        </Button>
        <Button
          variant="outline"
          className="h-12 rounded-xl"
          aria-label="Réinitialiser le graphe"
          onClick={() => {
            setQ("");
            router.replace("/brh-corpus/graph");
          }}
        >
          <RotateCcw size={17} />
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="atlas-segment">
          <button
            aria-pressed={view === "mentions"}
            onClick={() =>
              update({ view: "mentions", focus: "", relationship: "" })
            }
          >
            Documents et entités
          </button>
          <button
            aria-pressed={view === "relations"}
            onClick={() =>
              update({
                view: "relations",
                focus: search.get("focus")?.startsWith("entity:")
                  ? search.get("focus")!
                  : "",
                orphans: "",
              })
            }
          >
            Relations
          </button>
        </div>
        {search.get("focus") && (
          <div className="flex items-center gap-2 text-caption">
            <span>Vue locale</span>
            <Select
              value={search.get("hops") ?? "1"}
              onValueChange={(v) => v && update({ hops: v })}
            >
              <SelectTrigger
                aria-label="Profondeur du graphe"
                className="h-11 w-28 rounded-xl"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 niveau</SelectItem>
                <SelectItem value="2">2 niveaux</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              className="h-11"
              onClick={() => update({ focus: "" })}
            >
              Vue globale
            </Button>
          </div>
        )}
      </div>
      <div className="atlas-graph-workspace">
        {mobile === false ? (
          <Group orientation="horizontal">
            <Panel defaultSize="72%" minSize="35%">
              {stage}
            </Panel>
            <Separator
              className="atlas-resize-handle"
              aria-label="Redimensionner le panneau de contexte"
            />
            <Panel defaultSize="28%" minSize="24%" maxSize="50%">
              {inspector}
            </Panel>
          </Group>
        ) : (
          stage
        )}
      </div>
      <div className="atlas-graph-caption" role="status">
        <span>
          {data
            ? `${data.displayed_nodes} / ${data.matching_nodes} nœuds · ${data.displayed_edges} / ${data.matching_edges} liens`
            : "Carte des connaissances BRH"}
          {data?.truncated
            ? " · Vue partielle : affinez ou sélectionnez un point de départ."
            : ""}
        </span>
        <span>Publications actuelles · Sources consultables</span>
      </div>
      <Sheet
        open={!!mobile && !!selected}
        onOpenChange={(v) => {
          if (!v) close();
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (returnFocus.current?.isConnected
              ? returnFocus.current
              : listToggle.current
            )?.focus();
          }}
          className="max-h-[45dvh] overflow-auto rounded-t-3xl p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Contexte du graphe</SheetTitle>
            <SheetDescription>
              Informations, connexions et preuves documentaires
            </SheetDescription>
          </SheetHeader>
          {inspector}
        </SheetContent>
      </Sheet>
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Votre angle d’exploration</SheetTitle>
            <SheetDescription>
              Les filtres s’appliquent à tout le corpus.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-5 pb-8">
            {[
              ["family", "Collection", familyLabels],
              ["kind", "Type d’entité", entityLabels],
              ...(view === "relations"
                ? [["relationship", "Relation", relationshipLabels]]
                : []),
            ].map(([key, label, labels]) => (
              <div key={String(key)}>
                <label
                  className="mb-2 block text-small"
                  htmlFor={`atlas-${key}`}
                >
                  {String(label)}
                </label>
                <Select
                  value={draft[String(key)] || "all"}
                  onValueChange={(v) =>
                    v && setDraft({ ...draft, [String(key)]: v })
                  }
                >
                  <SelectTrigger
                    id={`atlas-${key}`}
                    className="h-11 w-full rounded-xl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tout afficher</SelectItem>
                    {Object.entries(labels).map(([v, l]) => (
                      <SelectItem value={v} key={v}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div>
              <label htmlFor="atlas-year" className="mb-2 block text-small">
                Année de la période couverte
              </label>
              <Input
                id="atlas-year"
                type="number"
                min={1800}
                max={2200}
                value={draft.year ?? ""}
                onChange={(e) => setDraft({ ...draft, year: e.target.value })}
              />
            </div>
            {view === "mentions" && (
              <label className="flex min-h-11 items-center gap-3 text-small">
                <input
                  type="checkbox"
                  checked={draft.orphans === "true"}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      orphans: e.target.checked ? "true" : "false",
                    })
                  }
                />
                Inclure les documents sans connexion
              </label>
            )}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setDraft({})}>
                Réinitialiser
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  const changes: Record<string, string> = {};
                  ["family", "year", "kind", "relationship", "orphans"].forEach(
                    (k) =>
                      (changes[k] = draft[k] === "all" ? "" : (draft[k] ?? "")),
                  );
                  update(changes);
                  setFiltersOpen(false);
                }}
              >
                Appliquer
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

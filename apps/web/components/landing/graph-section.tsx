"use client";

import { useRef, useState, type FormEvent } from "react";

import { graphMock, graphNodeById } from "@/lib/landing/graph/fixtures";
import { graphPath } from "@/lib/landing/graph/path";

import { GraphCanvas } from "./graph-canvas";
import { GraphInspector } from "./graph-inspector";
import { GraphListView } from "./graph-list-view";
import { GraphSectionHeading } from "./graph-section-heading";
import { GraphToolbar } from "./graph-toolbar";
import { LandingIcon } from "./icons";

export function GraphSection() {
  const previewNodes = graphMock.nodes.filter((node) => node.preview);
  const previewEdges = graphMock.edges.filter((edge) => edge.preview);
  const [selectedNodeId, setSelectedNodeId] = useState("ent-brh");
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showDocumented, setShowDocumented] = useState(true);
  const [showProposed, setShowProposed] = useState(true);
  const [view, setView] = useState<"graph" | "list">("graph");
  const [query, setQuery] = useState("");
  const [scale, setScale] = useState(1);
  const [activePath, setActivePath] = useState<{
    nodeIds: string[];
    edgeIds: string[];
  } | null>(null);
  const inspectorRef = useRef<HTMLHeadingElement>(null);

  const selectedNode = graphNodeById(selectedNodeId);
  const selectedEdge = graphMock.edges.find(
    (edge) => edge.id === selectedEdgeId,
  );
  const nodeRelations = selectedNode
    ? graphMock.edges.filter(
        (edge) =>
          edge.source === selectedNode.id || edge.target === selectedNode.id,
      )
    : [];
  const visibleEdges = previewEdges.filter(
    (edge) =>
      (edge.status === "documented" && showDocumented) ||
      (edge.status === "proposed" && showProposed),
  );
  const pathIds = activePath
    ? [...activePath.nodeIds, ...activePath.edgeIds]
    : [];

  const focusInspector = () =>
    window.setTimeout(() => inspectorRef.current?.focus(), 0);

  const selectNode = (id: string) => {
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    focusInspector();
  };

  const selectEdge = (id: string) => {
    setSelectedEdgeId(id);
    setSelectedNodeId("");
    focusInspector();
  };

  const searchNode = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const match = graphMock.nodes.find((node) =>
      node.label.toLocaleLowerCase("fr").includes(query.toLocaleLowerCase("fr")),
    );
    if (match) selectNode(match.id);
  };

  const showSocabankPath = () => {
    const result = graphPath("ent-socabank", "ent-bnc", {
      maxHops: 4,
      status: ["documented", "proposed"],
    });
    setActivePath(result);
    setShowProposed(true);
    if (result?.edgeIds[0]) selectEdge(result.edgeIds[0]);
  };

  const assistantContext = selectedEdge
    ? `Explique le lien « ${graphNodeById(selectedEdge.source)?.label} — ${selectedEdge.label} — ${graphNodeById(selectedEdge.target)?.label} » dans le corpus. Cite le document et la page. Distingue les mentions documentées des relations proposées.`
    : `Explique les connexions de « ${selectedNode?.label ?? "BRH"} » dans le corpus. Cite les documents et les pages. Distingue les mentions documentées des relations proposées.`;

  return (
    <section className="graph-section" id="graphe">
      <div className="section graph-section-inner">
        <GraphSectionHeading />

        <div className="graph-explorer">
          <div className="graph-workspace">
            <GraphToolbar
              query={query}
              onQueryChange={setQuery}
              onSearch={searchNode}
              showDocumented={showDocumented}
              showProposed={showProposed}
              onToggleDocumented={() => setShowDocumented(!showDocumented)}
              onToggleProposed={() => setShowProposed(!showProposed)}
              view={view}
              onViewChange={setView}
            />

            {view === "graph" ? (
              <GraphCanvas
                nodes={previewNodes}
                edges={visibleEdges}
                selectedNodeId={selectedNodeId}
                selectedEdgeId={selectedEdgeId}
                pathIds={pathIds}
                scale={scale}
                onZoomIn={() => setScale(Math.min(1.25, scale + 0.1))}
                onZoomOut={() => setScale(Math.max(0.8, scale - 0.1))}
                onResetZoom={() => setScale(1)}
                onSelectNode={selectNode}
                onSelectEdge={selectEdge}
              />
            ) : (
              <GraphListView
                nodes={previewNodes}
                edges={visibleEdges}
                onSelectNode={selectNode}
                onSelectEdge={selectEdge}
              />
            )}

            <div className="graph-action-row">
              <button onClick={showSocabankPath}>
                <LandingIcon name="nodes" size={16} />
                Trouver un chemin
              </button>
              <span>
                Exemple : <b>Socabank → BNC</b>
              </span>
              <p>Aucune relation validée dans cet aperçu.</p>
            </div>
          </div>

          <GraphInspector
            inspectorRef={inspectorRef}
            activePath={activePath}
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            nodeRelations={nodeRelations}
            assistantContext={assistantContext}
            onSelectEdge={selectEdge}
          />
        </div>

        <p className="graph-disclaimer">
          <LandingIcon name="shield" size={15} />
          {graphMock.meta.disclaimer} Les 344 relations extraites sont en attente
          ou rejetées ; aucune n’est présentée comme un fait.
        </p>
      </div>
    </section>
  );
}

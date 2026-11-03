"use client";

import { useRef, useState, type FormEvent } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  graphMock,
  graphPath,
  type GraphEdge,
  type GraphNode,
} from "@/lib/landing/graph-mock";

import { LandingIcon } from "./icons";

const graphPositions: Record<string, { x: number; y: number }> = {
  "doc-bulletin-97": { x: 150, y: 190 },
  "doc-circulaire-cec-10": { x: 580, y: 170 },
  "ent-brh": { x: 365, y: 215 },
  "ent-direction-mae": { x: 285, y: 70 },
  "ent-bnc": { x: 235, y: 345 },
  "ent-cec": { x: 690, y: 290 },
  "ent-socabank": { x: 82, y: 385 },
  "ent-comite-surveillance": { x: 565, y: 400 },
  "ent-loi-2002": { x: 755, y: 95 },
};

const graphLabels: Record<string, string[]> = {
  "doc-bulletin-97": ["Bulletin 97", "oct.–déc. 2015"],
  "doc-circulaire-cec-10": ["Circulaire #10", "gouvernance CEC"],
  "ent-direction-mae": ["Direction Monnaie", "& Analyse Éco."],
  "ent-bnc": ["Banque Nationale", "de Crédit"],
  "ent-comite-surveillance": ["Comité de", "surveillance"],
  "ent-loi-2002": ["Loi du", "26 juin 2002"],
};

function graphNodeById(id: string) {
  return graphMock.nodes.find((node) => node.id === id);
}

function evidenceHref(edge: GraphEdge) {
  const source = graphNodeById(edge.source);
  let slug = source?.type === "document" ? source.slug : undefined;
  if (!slug && edge.sourceTitle?.includes("Bulletin")) {
    slug = graphNodeById("doc-bulletin-97")?.slug;
  }
  if (!slug && edge.sourceTitle?.includes("Circulaire")) {
    slug = graphNodeById("doc-circulaire-cec-10")?.slug;
  }
  return slug
    ? `/documents/${slug}?page=${edge.page}`
    : `/brh-corpus?q=${encodeURIComponent(edge.sourceTitle ?? edge.quote)}`;
}

function GraphNodeShape({
  node,
  selected,
  path,
  onSelect,
}: {
  node: GraphNode;
  selected: boolean;
  path: boolean;
  onSelect: () => void;
}) {
  const { x, y } = graphPositions[node.id];
  const labels = graphLabels[node.id] ?? [node.label];
  const nodeClass = `research-node ${node.type} ${selected ? "selected" : ""} ${
    path ? "on-path" : ""
  }`;

  return (
    <g
      className={nodeClass}
      role="button"
      tabIndex={0}
      aria-label={`${
        node.type === "document"
          ? "Document"
          : node.type === "regulation"
            ? "Régulation"
            : "Institution"
      } : ${node.label}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      {node.type === "document" && (
        <rect x={x - 70} y={y - 30} width="140" height="60" rx="13" />
      )}
      {node.type === "institution" && (
        <circle cx={x} cy={y} r={node.id === "ent-brh" ? 43 : 34} />
      )}
      {node.type === "regulation" && (
        <polygon
          points={`${x - 43},${y} ${x - 22},${y - 35} ${x + 22},${y - 35} ${x + 43},${y} ${x + 22},${y + 35} ${x - 22},${y + 35}`}
        />
      )}
      <text x={x} y={y} textAnchor="middle">
        {labels.map((label, index) => (
          <tspan
            key={label}
            x={x}
            dy={index === 0 ? (labels.length > 1 ? -5 : 3) : 13}
          >
            {label}
          </tspan>
        ))}
      </text>
      <title>{node.label}</title>
    </g>
  );
}

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
        <div className="graph-section-heading">
          <div>
            <p className="eyebrow">
              <span />
              LE GRAPHE · RELIER LES SOURCES
            </p>
            <h2>Un document. Tout un réseau de pistes.</h2>
          </div>
          <div>
            <p>
              Suivez les institutions, les circulaires, les indicateurs et les
              documents qui se répondent. Chaque lien garde sa source.
            </p>
            <a href="/brh-corpus/graph">
              Ouvrir le graphe complet <LandingIcon name="arrow" size={15} />
            </a>
          </div>
        </div>

        <div className="graph-explorer">
          <div className="graph-workspace">
            <div className="graph-toolbar">
              <form onSubmit={searchNode}>
                <label htmlFor="graph-search">Rechercher un nœud</label>
                <div>
                  <LandingIcon name="search" size={16} />
                  <input
                    id="graph-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="BRH, CEC, circulaire…"
                  />
                </div>
              </form>
              <div className="graph-status-filters">
                <button
                  className="documented"
                  aria-pressed={showDocumented}
                  onClick={() => setShowDocumented(!showDocumented)}
                >
                  <i /> Mentions
                </button>
                <button
                  className="proposed"
                  aria-pressed={showProposed}
                  onClick={() => setShowProposed(!showProposed)}
                >
                  <i /> Proposées
                </button>
                <button className="validated" disabled>
                  <i /> Validées · 0
                </button>
              </div>
              <div className="graph-view-toggle">
                <button
                  aria-pressed={view === "graph"}
                  onClick={() => setView("graph")}
                >
                  Graphe
                </button>
                <button
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                >
                  Liste
                </button>
              </div>
            </div>

            {view === "graph" ? (
              <div className="graph-canvas">
                <div className="preview-badge">
                  <span /> Aperçu exploratoire
                  <b>0 relation validée</b>
                </div>
                <svg
                  viewBox="0 0 850 470"
                  role="group"
                  aria-label="Graphe exploratoire de neuf nœuds et dix liens"
                >
                  <g
                    className="graph-zoom-layer"
                    style={{
                      transform: `scale(${scale})`,
                      transformOrigin: "425px 235px",
                    }}
                  >
                    <g className="research-edges">
                      {visibleEdges.map((edge) => {
                        const source = graphPositions[edge.source];
                        const target = graphPositions[edge.target];
                        const active =
                          selectedEdgeId === edge.id ||
                          pathIds.includes(edge.id);

                        return (
                          <g
                            key={edge.id}
                            className={`research-edge ${edge.status} ${
                              active ? "selected" : ""
                            }`}
                            role="button"
                            tabIndex={0}
                            aria-label={`${edge.label}, ${
                              edge.status === "documented"
                                ? "mention documentée"
                                : "relation proposée à vérifier"
                            }, page ${edge.page}`}
                            onClick={() => selectEdge(edge.id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                selectEdge(edge.id);
                              }
                            }}
                          >
                            <path
                              className="edge-hit"
                              d={`M${source.x} ${source.y}L${target.x} ${target.y}`}
                            />
                            <path
                              d={`M${source.x} ${source.y}L${target.x} ${target.y}`}
                            />
                            <title>
                              {edge.status === "documented"
                                ? `mention documentée · p. ${edge.page}`
                                : `relation proposée · à vérifier · p. ${edge.page}`}
                            </title>
                          </g>
                        );
                      })}
                    </g>
                    {previewNodes.map((node) => (
                      <GraphNodeShape
                        key={node.id}
                        node={node}
                        selected={selectedNodeId === node.id}
                        path={pathIds.includes(node.id)}
                        onSelect={() => selectNode(node.id)}
                      />
                    ))}
                  </g>
                </svg>
                <div
                  className="graph-controls"
                  aria-label="Contrôles du graphe"
                >
                  <button
                    onClick={() => setScale(Math.min(1.25, scale + 0.1))}
                    aria-label="Zoom avant"
                  >
                    +
                  </button>
                  <button
                    onClick={() => setScale(Math.max(0.8, scale - 0.1))}
                    aria-label="Zoom arrière"
                  >
                    −
                  </button>
                  <button onClick={() => setScale(1)}>Recentrer</button>
                </div>
                <div className="research-legend">
                  <span>
                    <i className="institution" /> Institution
                  </span>
                  <span>
                    <i className="document" /> Document
                  </span>
                  <span>
                    <i className="regulation" /> Régulation
                  </span>
                  <span>
                    <i className="mention-line" /> Mention
                  </span>
                  <span>
                    <i className="proposed-line" /> Proposée
                  </span>
                </div>
              </div>
            ) : (
              <div className="graph-list-view">
                <div>
                  <h3>Nœuds de l’aperçu</h3>
                  {previewNodes.map((node) => (
                    <button key={node.id} onClick={() => selectNode(node.id)}>
                      <span className={node.type} />
                      <b>{node.label}</b>
                      <small>{node.type}</small>
                    </button>
                  ))}
                </div>
                <div>
                  <h3>Liens avec preuve</h3>
                  {visibleEdges.map((edge) => (
                    <button key={edge.id} onClick={() => selectEdge(edge.id)}>
                      <span className={`edge-list-mark ${edge.status}`} />
                      <b>
                        {graphNodeById(edge.source)?.label} →{" "}
                        {graphNodeById(edge.target)?.label}
                      </b>
                      <small>
                        {edge.label} · p. {edge.page}
                      </small>
                    </button>
                  ))}
                </div>
              </div>
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

          <ScrollArea className="graph-inspector">
            <div className="graph-inspector-content" aria-live="polite">
            {activePath && (
              <div className="path-result">
                <span>
                  CHEMIN TROUVÉ · {activePath.edgeIds.length} LIEN
                  {activePath.edgeIds.length > 1 ? "S" : ""}
                </span>
                <strong>Socabank → Banque Nationale de Crédit</strong>
                <p>Relation proposée, à vérifier · Bulletin 97 · p. 13</p>
              </div>
            )}

            {selectedEdge ? (
              <>
                <p className="inspector-kicker">LIEN SÉLECTIONNÉ</p>
                <h3 ref={inspectorRef} tabIndex={-1}>
                  {selectedEdge.label}
                </h3>
                <div className="edge-parties">
                  <span>{graphNodeById(selectedEdge.source)?.label}</span>
                  <LandingIcon name="arrow" size={15} />
                  <span>{graphNodeById(selectedEdge.target)?.label}</span>
                </div>
                <span className={`status-badge ${selectedEdge.status}`}>
                  {selectedEdge.status === "documented"
                    ? "Mention documentée"
                    : "Relation proposée · à vérifier"}
                </span>
                {selectedEdge.probability && (
                  <p className="probability">
                    Confiance d’extraction :{" "}
                    <b>{Math.round(selectedEdge.probability * 100)} %</b>
                  </p>
                )}
                <div className="inspector-evidence">
                  <span>
                    SOURCE · PAGE{" "}
                    {selectedEdge.page.toString().padStart(2, "0")}
                  </span>
                  <blockquote>« {selectedEdge.quote} »</blockquote>
                  {selectedEdge.sourceTitle && (
                    <small>{selectedEdge.sourceTitle}</small>
                  )}
                </div>
                <a
                  className="inspector-primary"
                  href={evidenceHref(selectedEdge)}
                >
                  Pourquoi ce lien ? <LandingIcon name="arrow" size={15} />
                </a>
              </>
            ) : selectedNode ? (
              <>
                <p className="inspector-kicker">NŒUD SÉLECTIONNÉ</p>
                <span className={`node-type-badge ${selectedNode.type}`}>
                  {selectedNode.type === "document"
                    ? "Document"
                    : selectedNode.type === "regulation"
                      ? "Régulation"
                      : "Institution"}
                </span>
                <h3 ref={inspectorRef} tabIndex={-1}>
                  {selectedNode.label}
                </h3>
                {selectedNode.type === "document" && (
                  <p className="node-meta">
                    {selectedNode.family} · {selectedNode.pages} pages
                  </p>
                )}
                <div className="relation-heading">
                  <span>Connexions</span>
                  <b>{nodeRelations.length}</b>
                </div>
                <div className="inspector-relations">
                  {nodeRelations.length ? (
                    nodeRelations.map((edge) => {
                      const otherId =
                        edge.source === selectedNode.id
                          ? edge.target
                          : edge.source;
                      return (
                        <button
                          key={edge.id}
                          onClick={() => selectEdge(edge.id)}
                        >
                          <span>
                            <b>{edge.label}</b>
                            <small>p. {edge.page}</small>
                          </span>
                          <strong>{graphNodeById(otherId)?.label}</strong>
                          <em className={edge.status}>
                            {edge.status === "documented"
                              ? "documentée"
                              : "proposée"}
                          </em>
                          <p>« {edge.quote} »</p>
                        </button>
                      );
                    })
                  ) : (
                    <p>
                      Aucune relation documentée pour ce nœud dans cet aperçu.
                    </p>
                  )}
                </div>
              </>
            ) : null}

            <div className="inspector-actions">
              <a
                className="button"
                href={`/assistant?q=${encodeURIComponent(assistantContext)}`}
              >
                Expliquer ces connexions
              </a>
              <a href="/brh-corpus/graph">Explorer les voisins</a>
            </div>
            </div>
          </ScrollArea>
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

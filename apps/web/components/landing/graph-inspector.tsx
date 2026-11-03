import type { RefObject } from "react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { graphNodeById } from "@/lib/landing/graph/fixtures";
import { graphNodeTypeLabel } from "@/lib/landing/graph/layout";
import { evidenceHref } from "@/lib/landing/graph/links";
import type { GraphEdge, GraphNode } from "@/lib/landing/graph/types";

import { LandingIcon } from "./icons";

type GraphInspectorProps = {
  inspectorRef: RefObject<HTMLHeadingElement | null>;
  activePath: { nodeIds: string[]; edgeIds: string[] } | null;
  selectedNode: GraphNode | undefined;
  selectedEdge: GraphEdge | undefined;
  nodeRelations: GraphEdge[];
  assistantContext: string;
  onSelectEdge: (id: string) => void;
};

export function GraphInspector({
  inspectorRef,
  activePath,
  selectedNode,
  selectedEdge,
  nodeRelations,
  assistantContext,
  onSelectEdge,
}: GraphInspectorProps) {
  return (
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
              {graphNodeTypeLabel(selectedNode.type)}
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
                      onClick={() => onSelectEdge(edge.id)}
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
  );
}

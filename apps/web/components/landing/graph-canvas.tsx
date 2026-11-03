import {
  GRAPH_TRANSFORM_ORIGIN,
  GRAPH_VIEWBOX,
  graphPositions,
} from "@/lib/landing/graph/layout";
import type { GraphEdge, GraphNode } from "@/lib/landing/graph/types";

import { GraphNodeShape } from "./graph-node-shape";

type GraphCanvasProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNodeId: string;
  selectedEdgeId: string | null;
  pathIds: string[];
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onSelectNode: (id: string) => void;
  onSelectEdge: (id: string) => void;
};

export function GraphCanvas({
  nodes,
  edges,
  selectedNodeId,
  selectedEdgeId,
  pathIds,
  scale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onSelectNode,
  onSelectEdge,
}: GraphCanvasProps) {
  return (
    <>
      <p className="graph-mobile-hint">
        Balayez le graphe pour explorer, puis touchez un élément pour voir sa
        source.
      </p>
      <div className="graph-canvas">
        <div className="preview-badge">
          <span /> Aperçu exploratoire
          <b>0 relation validée</b>
        </div>
        <svg
          viewBox={GRAPH_VIEWBOX}
          role="group"
          aria-label="Graphe exploratoire de neuf nœuds et dix liens"
        >
          <g
            className="graph-zoom-layer"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: GRAPH_TRANSFORM_ORIGIN,
            }}
          >
            <g className="research-edges">
              {edges.map((edge) => {
                const source = graphPositions[edge.source];
                const target = graphPositions[edge.target];
                const active =
                  selectedEdgeId === edge.id || pathIds.includes(edge.id);

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
                    onClick={() => onSelectEdge(edge.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelectEdge(edge.id);
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
            {nodes.map((node) => (
              <GraphNodeShape
                key={node.id}
                node={node}
                selected={selectedNodeId === node.id}
                path={pathIds.includes(node.id)}
                onSelect={() => onSelectNode(node.id)}
              />
            ))}
          </g>
        </svg>
        <div className="graph-controls" aria-label="Contrôles du graphe">
          <button onClick={onZoomIn} aria-label="Zoom avant">
            +
          </button>
          <button onClick={onZoomOut} aria-label="Zoom arrière">
            −
          </button>
          <button onClick={onResetZoom}>Recentrer</button>
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
    </>
  );
}

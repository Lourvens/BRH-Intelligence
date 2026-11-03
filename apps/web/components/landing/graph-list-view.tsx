import { graphNodeById } from "@/lib/landing/graph/fixtures";
import type { GraphEdge, GraphNode } from "@/lib/landing/graph/types";

type GraphListViewProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onSelectNode: (id: string) => void;
  onSelectEdge: (id: string) => void;
};

export function GraphListView({
  nodes,
  edges,
  onSelectNode,
  onSelectEdge,
}: GraphListViewProps) {
  return (
    <div className="graph-list-view">
      <div>
        <h3>Nœuds de l’aperçu</h3>
        {nodes.map((node) => (
          <button key={node.id} onClick={() => onSelectNode(node.id)}>
            <span className={node.type} />
            <b>{node.label}</b>
            <small>{node.type}</small>
          </button>
        ))}
      </div>
      <div>
        <h3>Liens avec preuve</h3>
        {edges.map((edge) => (
          <button key={edge.id} onClick={() => onSelectEdge(edge.id)}>
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
  );
}

import {
  GRAPH_DOCUMENT_GEOMETRY,
  GRAPH_INSTITUTION_HUB_RADIUS,
  GRAPH_INSTITUTION_RADIUS,
  GRAPH_REGULATION_GEOMETRY,
  graphLabels,
  graphNodeTypeLabel,
  graphPositions,
} from "@/lib/landing/graph/layout";
import type { GraphNode } from "@/lib/landing/graph/types";

type GraphNodeShapeProps = {
  node: GraphNode;
  selected: boolean;
  path: boolean;
  onSelect: () => void;
};

export function GraphNodeShape({
  node,
  selected,
  path,
  onSelect,
}: GraphNodeShapeProps) {
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
      aria-label={`${graphNodeTypeLabel(node.type)} : ${node.label}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      {node.type === "document" && (
        <rect
          x={x - GRAPH_DOCUMENT_GEOMETRY.halfWidth}
          y={y - GRAPH_DOCUMENT_GEOMETRY.halfHeight}
          width={GRAPH_DOCUMENT_GEOMETRY.width}
          height={GRAPH_DOCUMENT_GEOMETRY.height}
          rx={GRAPH_DOCUMENT_GEOMETRY.radius}
        />
      )}
      {node.type === "institution" && (
        <circle
          cx={x}
          cy={y}
          r={
            node.id === "ent-brh"
              ? GRAPH_INSTITUTION_HUB_RADIUS
              : GRAPH_INSTITUTION_RADIUS
          }
        />
      )}
      {node.type === "regulation" && (
        <polygon
          points={`${x - GRAPH_REGULATION_GEOMETRY.halfWidth},${y} ${x - GRAPH_REGULATION_GEOMETRY.shoulderX},${y - GRAPH_REGULATION_GEOMETRY.shoulderY} ${x + GRAPH_REGULATION_GEOMETRY.shoulderX},${y - GRAPH_REGULATION_GEOMETRY.shoulderY} ${x + GRAPH_REGULATION_GEOMETRY.halfWidth},${y} ${x + GRAPH_REGULATION_GEOMETRY.shoulderX},${y + GRAPH_REGULATION_GEOMETRY.shoulderY} ${x - GRAPH_REGULATION_GEOMETRY.shoulderX},${y + GRAPH_REGULATION_GEOMETRY.shoulderY}`}
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

import {
  ArrowRight,
  CreditCard,
  FileText,
  Landmark,
  Share2,
  type LucideIcon,
} from "lucide-react";

import { graphData, type GraphViewNode } from "@/lib/chat/decision";
import type { TableArtifact } from "@/lib/chat/types";

function nodeIcon(node: GraphViewNode): LucideIcon {
  if (node.kind === "Source") return FileText;
  if (node.kind === "Crédit") return CreditCard;
  if (node.kind === "Institution") return Landmark;
  return Share2;
}

export function GraphArtifactCard({ artifact }: { artifact: TableArtifact }) {
  const { nodes, edges } = graphData(artifact);
  if (!nodes.length) return null;

  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-border px-3.5 py-3">
        <div>
          <figcaption className="font-display text-caption font-bold text-navy">
            {artifact.title}
          </figcaption>
          <p className="text-[10px] text-ink-muted">{artifact.subtitle}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded border border-navy/15 bg-navy/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-navy">
          <Share2 className="size-3" aria-hidden />
          Graphe
        </span>
      </div>

      <div
        role="group"
        aria-label={`${artifact.title}: ${nodes.map((node) => node.label).join(", ")}`}
        className="flex flex-col items-stretch gap-2 bg-bg/40 p-3 sm:flex-row sm:items-center"
      >
        {nodes.map((node, index) => {
          const Icon = nodeIcon(node);
          const isLast = index === nodes.length - 1;
          const edge = edges[index];

          return (
            <div key={node.id} className="contents">
              <div
                className={`min-w-0 flex-1 rounded-xl border p-3 ${
                  isLast
                    ? "border-azure/35 bg-azure/5"
                    : "border-border bg-surface"
                }`}
              >
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-teal">
                    {node.kind}
                  </span>
                  {node.page ? (
                    <span className="rounded bg-surface-alt px-1.5 py-0.5 font-mono text-[9px] text-ink-muted">
                      p. {node.page}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-start gap-2">
                  <Icon className="mt-0.5 size-4 shrink-0 text-navy" aria-hidden />
                  <span className="text-[11px] font-semibold leading-snug text-navy">
                    {node.label}
                  </span>
                </div>
              </div>

              {!isLast ? (
                <div className="flex shrink-0 flex-col items-center gap-0.5">
                  <ArrowRight className="size-4 rotate-90 text-azure sm:rotate-0" aria-hidden />
                  {edge?.label ? (
                    <span className="max-w-[100px] text-center text-[8px] uppercase tracking-wider text-ink-muted">
                      {edge.label}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="border-t border-border px-3.5 py-2 text-[10px] text-ink-muted">
        Source : {artifact.source}
      </div>
    </figure>
  );
}

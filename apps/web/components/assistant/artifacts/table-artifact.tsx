import { Table2 } from "lucide-react";

import type { TableArtifact } from "@/lib/chat/types";

export function TableArtifactView({ artifact }: { artifact: TableArtifact }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-start justify-between gap-3 border-b border-border px-3.5 py-3">
        <div>
          <figcaption className="font-display text-caption font-bold text-navy">
            {artifact.title}
          </figcaption>
          <p className="text-[10px] text-ink-muted">{artifact.subtitle}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded border border-border bg-surface-alt px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-muted">
          <Table2 className="size-3" aria-hidden />
          Tableau
        </span>
      </div>

      <div className="overflow-x-auto bg-bg/40 p-2.5">
        <table className="w-full min-w-[420px] border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-border">
              {artifact.schema.columns.map((column) => (
                <th
                  key={column.key}
                  className="px-2 py-1.5 font-bold text-navy"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {artifact.schema.rows.map((row, index) => (
              <tr key={index}>
                {artifact.schema.columns.map((column) => (
                  <td key={column.key} className="px-2 py-1.5 text-ink">
                    {row[column.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border px-3.5 py-2 text-[10px] text-ink-muted">
        Source : {artifact.source}
      </div>
    </figure>
  );
}

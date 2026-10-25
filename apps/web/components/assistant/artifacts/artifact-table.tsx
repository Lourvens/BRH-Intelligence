import type { TableArtifact } from "@/lib/chat/types";

export function ArtifactTable({ artifact }: { artifact: TableArtifact }) {
  return (
    <div className="max-w-full overflow-x-auto bg-surface">
      <table className="w-full border-collapse text-left text-caption">
        <caption className="sr-only">{artifact.title} — données du graphique</caption>
        <thead className="bg-surface-alt"><tr>{artifact.schema.columns.map((column) => <th key={column.key} scope="col" className="whitespace-nowrap border-b border-border px-4 py-3 font-semibold text-navy-ink">{column.label}</th>)}</tr></thead>
        <tbody className="divide-y divide-border">{artifact.schema.rows.map((row, index) => <tr key={index}>{artifact.schema.columns.map((column) => <td key={column.key} className="px-4 py-3 text-ink">{row[column.key] ?? "—"}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

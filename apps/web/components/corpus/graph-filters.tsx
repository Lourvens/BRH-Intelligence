"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { entityLabels, familyLabels, relationshipLabels } from "@/lib/corpus/labels";

export function GraphFilters({ query }: { query: Record<string, string> }) {
  const selections = [
    ["family", "Famille", familyLabels], ["kind", "Type d’entité", entityLabels],
    ["relationship", "Relation", relationshipLabels],
  ] as const;
  return <form method="get" className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Filtres du graphe">
    <input type="hidden" name="hops" value={query.hops ?? "1"} />
    {selections.map(([key, label, labels]) => <div key={key} className="space-y-1.5">
      <label htmlFor={`graph-${key}`} className="text-caption text-ink-muted">{label}</label>
      <Select name={key} defaultValue={query[key] || "all"}><SelectTrigger id={`graph-${key}`} className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="all">Tous</SelectItem>{Object.entries(labels).map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent>
      </Select>
    </div>)}
    <div className="space-y-1.5"><label htmlFor="graph-year" className="text-caption text-ink-muted">Période · année</label><Input id="graph-year" name="year" type="number" min={1800} max={2200} defaultValue={query.year} placeholder="Toutes" /></div>
    <Button type="submit" variant="outline" className="self-end rounded-sm">Filtrer le graphe</Button>
  </form>;
}

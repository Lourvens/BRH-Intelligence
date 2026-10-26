"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { graphArtifact, researchTree } from "@/lib/corpus/graph";
import { relationshipLabels } from "@/lib/corpus/labels";
import type { GraphResult } from "@/lib/corpus/types";
import { EvidenceCard } from "./evidence-card";

const EntityNetwork = dynamic(() => import("./entity-network"), { ssr: false, loading: () => <div className="grid h-[440px] place-items-center text-small text-ink-muted">Chargement du réseau…</div> });
const MermaidGraph = dynamic(() => import("@/components/assistant/artifacts/mermaid-graph").then((module) => module.MermaidGraph), { ssr: false });

export function GraphExplorer({ graph }: { graph: GraphResult }) {
  const router = useRouter();
  const tree = researchTree(graph);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<"TD" | "LR">("TD");
  const selected = graph.edges.find((edge) => edge.assertion_id === selectedId);
  const byId = new Map(graph.nodes.map((node) => [node.entity_id, node]));
  const onSelect = useCallback((kind: string, identifier: string) => {
    if (kind === "node") router.push(`/brh-corpus/entities/${identifier}`);
    else if (kind === "edge") setSelectedId(identifier);
  }, [router]);
  if (!graph.edges.length) return <div className="border border-dashed border-border px-6 py-10 text-center text-small leading-6 text-ink-muted">Aucune relation validée pour ces critères. Les mentions documentaires restent disponibles ci-dessous.</div>;
  return <div className="space-y-5">
    <Tabs defaultValue={tree ? "diagram" : "network"} className="gap-0 border border-border">
      <TabsList variant="line" className="m-3 gap-4"><TabsTrigger value="network">Réseau</TabsTrigger><TabsTrigger value="diagram">Diagramme</TabsTrigger></TabsList>
      <TabsContent value="network"><EntityNetwork graph={graph} onSelect={onSelect} /></TabsContent>
      <TabsContent value="diagram">
        <ToggleGroup type="single" value={orientation} onValueChange={(value) => { if (value === "TD" || value === "LR") setOrientation(value); }} className="px-3" aria-label="Orientation du diagramme">
          <ToggleGroupItem value="TD" aria-label="Orientation verticale">Vertical</ToggleGroupItem><ToggleGroupItem value="LR" aria-label="Orientation horizontale">Horizontal</ToggleGroupItem>
        </ToggleGroup>
        <MermaidGraph artifact={graphArtifact(graph)} orientation={orientation} />
      </TabsContent>
    </Tabs>
    <p className="text-caption text-ink-muted">Relations extraites et vérifiées automatiquement · Chaque relation conserve sa preuve et son contexte historique.</p>
    {graph.truncated ? <p role="status" className="text-small text-ink-muted">Vue limitée à 100 entités et 200 relations. Affinez les critères pour explorer le reste.</p> : null}
    {selected ? <section aria-label="Preuve sélectionnée"><h3 className="mb-3 text-small font-semibold text-navy-ink">Preuve de la relation sélectionnée</h3><EvidenceCard evidence={selected.evidence} /></section> : null}
    <div className="overflow-x-auto"><table className="w-full text-left text-small">
      <caption className="mb-3 text-left font-semibold text-navy-ink">Relations et preuves</caption>
      <thead className="border-y border-border bg-surface-alt text-caption text-ink-muted"><tr><th className="p-3">Source</th><th className="p-3">Relation</th><th className="p-3">Cible</th><th className="p-3">Preuve</th></tr></thead>
      <tbody>{graph.edges.map((edge) => <tr key={edge.assertion_id} className="border-b border-border">
        <td className="p-3"><Link href={`/brh-corpus/entities/${edge.subject_id}`} className="text-teal hover:underline">{byId.get(edge.subject_id)?.label}</Link></td>
        <td className="p-3">{relationshipLabels[edge.predicate] ?? edge.predicate}{edge.temporal_context ? <span className="mt-1 block text-caption text-ink-muted">{edge.temporal_context}</span> : null}</td>
        <td className="p-3"><Link href={`/brh-corpus/entities/${edge.object_id}`} className="text-teal hover:underline">{byId.get(edge.object_id)?.label}</Link></td>
        <td className="p-3"><button type="button" onClick={() => setSelectedId(edge.assertion_id)} aria-pressed={edge.assertion_id === selectedId} className="rounded-sm text-teal underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-azure">Page {edge.evidence.page_number}</button></td>
      </tr>)}</tbody>
    </table></div>
  </div>;
}

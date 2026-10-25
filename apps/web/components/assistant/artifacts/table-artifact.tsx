import { Table2 } from "lucide-react";
import type { TableArtifact } from "@/lib/chat/types";
import { ArtifactHeader, ArtifactProvenance } from "./artifact-frame";
import { ArtifactTable } from "./artifact-table";

export function TableArtifactView({ artifact }: { artifact: TableArtifact }) {
  return <figure className="min-w-0 overflow-hidden rounded-sm border border-border bg-surface"><ArtifactHeader artifact={artifact} icon={Table2} label="Tableau" /><ArtifactTable artifact={artifact} /><ArtifactProvenance source={artifact.source} /></figure>;
}

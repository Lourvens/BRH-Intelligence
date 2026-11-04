import { Activity, Database, MessageSquare, Layers3 } from "lucide-react";
import { adminNumber } from "@/lib/admin/format";
import type { AdminOverview } from "@/lib/admin/types";

export function OverviewMetrics({ overview }: { overview: AdminOverview }) {
  const cards = [
    {
      label: "Documents consultables",
      value: overview.corpus?.readable_documents,
      detail: `${adminNumber(overview.corpus?.readable_pages)} pages dans le corpus`,
      icon: Database,
    },
    {
      label: "Tours enregistrés",
      value: overview.usage.completed_turns,
      detail: `Sur les ${overview.usage.days} derniers jours (UTC)`,
      icon: Activity,
    },
    {
      label: "Avis à examiner",
      value: overview.feedback.new,
      detail: `${adminNumber(overview.feedback.in_review)} en cours de traitement`,
      icon: MessageSquare,
    },
    {
      label: "Traitements en échec",
      value: overview.jobs.counts.failed,
      detail: "Historique des tâches d’ingestion",
      icon: Layers3,
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, detail, icon: Icon }) => (
        <section
          key={label}
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-small text-ink-muted">{label}</h2>
            <Icon className="size-4 text-navy-ink" aria-hidden />
          </div>
          <p className="mt-4 text-headline font-semibold tabular-nums tracking-tight text-ink">
            {adminNumber(value)}
          </p>
          <p className="mt-2 text-caption text-ink-muted">{detail}</p>
        </section>
      ))}
    </div>
  );
}

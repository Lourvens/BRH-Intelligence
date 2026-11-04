import { adminDate } from "@/lib/admin/format";
import type { AdminOverview, FeedbackPage } from "@/lib/admin/types";
import { AdminHeader } from "./admin-header";
import { OverviewMetrics } from "./overview-metrics";
import { ServiceHealth } from "./service-health";
import { UsageChart } from "./usage-chart";
import { IngestionJobs } from "./ingestion-jobs";
import { FeedbackInbox } from "./feedback-inbox";

export function AdminDashboard({
  overview,
  feedback,
}: {
  overview: AdminOverview | null;
  feedback: FeedbackPage | null;
}) {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <AdminHeader />
      <main
        id="contenu"
        className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-8 sm:py-10"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-caption font-semibold uppercase tracking-widest text-navy-ink">
              Pilotage de la plateforme
            </p>
            <h1 className="mt-2 font-display text-headline font-semibold tracking-tight">
              Vue d’ensemble
            </h1>
            <p className="mt-2 text-small text-ink-muted">
              Suivez le corpus, l’activité de l’assistant et les retours reçus.
            </p>
          </div>
          <p className="text-caption text-ink-muted">
            Actualisé le {adminDate(overview?.generated_at)}
          </p>
        </div>
        {overview ? (
          <>
            <OverviewMetrics overview={overview} />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <UsageChart usage={overview.usage} />
              <ServiceHealth overview={overview} />
            </div>
            <IngestionJobs jobs={overview.jobs} />
          </>
        ) : (
          <div
            role="alert"
            className="rounded-2xl border border-border bg-surface p-6"
          >
            <h2 className="font-medium">
              Les indicateurs sont temporairement indisponibles.
            </h2>
            <p className="mt-2 text-small text-ink-muted">
              Vérifiez la configuration du service puis actualisez la page.
              Aucun chiffre estimé n’est affiché.
            </p>
          </div>
        )}
        <FeedbackInbox initial={feedback} />
      </main>
    </div>
  );
}

import { adminDate, adminNumber } from "@/lib/admin/format";
import type { AdminOverview } from "@/lib/admin/types";

const statuses: Record<string, string> = {
  pending: "En attente",
  running: "En cours",
  succeeded: "Terminé",
  failed: "Échec",
};
const stages: Record<string, string> = {
  download: "Téléchargement",
  extract: "Extraction",
  chunk: "Découpage",
  embed: "Encodage",
  index: "Indexation",
};

export function IngestionJobs({ jobs }: { jobs: AdminOverview["jobs"] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="p-5 sm:p-6">
        <h2 className="font-display text-lead font-semibold">
          Traitements du corpus
        </h2>
        <p className="mt-1 text-small text-ink-muted">
          Les 10 tâches les plus récentes du registre d’ingestion.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.entries(jobs.counts).map(([status, count]) => (
            <span
              key={status}
              className="rounded-lg bg-surface-alt px-3 py-1.5 text-caption"
            >
              {statuses[status] ?? status} :{" "}
              <strong className="tabular-nums">{adminNumber(count)}</strong>
            </span>
          ))}
        </div>
      </div>
      {!jobs.recent.length ? (
        <p className="px-6 pb-6 text-small text-ink-muted">
          Aucun traitement enregistré.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-small">
            <caption className="sr-only">
              Derniers traitements du corpus
            </caption>
            <thead className="border-y border-border bg-surface-alt/60 text-caption text-ink-muted">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Document
                </th>
                <th scope="col" className="px-4 py-3">
                  Étape
                </th>
                <th scope="col" className="px-4 py-3">
                  Statut
                </th>
                <th scope="col" className="px-6 py-3">
                  Début
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.recent.map((job) => (
                <tr
                  key={job.job_id}
                  className="border-b border-border last:border-0"
                >
                  <td className="max-w-sm px-6 py-4">
                    <p className="line-clamp-2 break-words">{job.title}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-ink-muted">
                    {stages[job.stage] ?? job.stage}
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-4 ${job.status === "failed" ? "text-scarlet" : job.status === "succeeded" ? "text-emerald" : "text-ink-muted"}`}
                  >
                    {statuses[job.status] ?? job.status}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-caption text-ink-muted">
                    {adminDate(job.started_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

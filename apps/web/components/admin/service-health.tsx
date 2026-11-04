import { CircleCheck, CircleAlert } from "lucide-react";
import { adminDate, adminNumber } from "@/lib/admin/format";
import type { AdminOverview } from "@/lib/admin/types";

export function ServiceHealth({ overview }: { overview: AdminOverview }) {
  const readiness = overview.readiness;
  const checks = [
    { label: "Base de données", ok: readiness?.database },
    { label: "Publications et stockage", ok: readiness?.artifact_storage },
    { label: "Corpus prêt à consulter", ok: readiness?.ready },
  ];
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-display text-lead font-semibold text-ink">
        État du service
      </h2>
      <p className="mt-1 text-small text-ink-muted">
        Disponibilité observée lors de l’actualisation.
      </p>
      <ul className="mt-5 space-y-4">
        {checks.map(({ label, ok }) => {
          const Icon = ok ? CircleCheck : CircleAlert;
          return (
            <li
              key={label}
              className="flex items-center justify-between gap-3 text-small"
            >
              <span>{label}</span>
              <span
                className={`inline-flex items-center gap-1.5 ${ok ? "text-emerald" : "text-scarlet"}`}
              >
                <Icon className="size-4" aria-hidden />
                {ok === undefined
                  ? "Inconnu"
                  : ok
                    ? "Disponible"
                    : "À vérifier"}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 border-t border-border pt-4 text-caption leading-relaxed text-ink-muted">
        <p>
          {adminNumber(readiness?.unpublished_documents)} document(s) sans
          publication.
        </p>
        <p>Dernière synchronisation : {adminDate(readiness?.last_synced_at)}</p>
        <p>
          Documents indexés : {adminNumber(overview.corpus?.indexed_documents)}
        </p>
      </div>
    </section>
  );
}

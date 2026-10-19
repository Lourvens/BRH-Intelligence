import { ArrowRight, ShieldAlert } from "lucide-react";

const candidates = [
  { title: "Note d’inflation p. 3", selected: true },
  { title: "Politique monétaire p. 6", selected: false },
  { title: "Inclusion financière p. 10", selected: false },
  { title: "Bulletin statistique p. 21", selected: false },
];

export function RetrievalDiagram() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-navy/70 p-6 backdrop-blur-md">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <span className="flex items-center gap-2 text-caption font-semibold text-white">
            <span className="size-2 rounded-full bg-azure" />
            Diagramme de routage sémantique
          </span>
          <span className="text-[11px] text-white/50">
            Seuil de pertinence
          </span>
        </div>

        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-12">
          <div className="rounded-xl border border-white/15 bg-ink p-3.5 sm:col-span-5">
            <div className="mb-1 text-[10px] font-bold uppercase text-azure">
              Requête
            </div>
            <div className="text-caption font-semibold text-white">
              « Inflation nov. 2025 »
            </div>
          </div>

          <div className="hidden justify-center text-azure sm:col-span-1 sm:flex">
            <ArrowRight className="size-5" aria-hidden />
          </div>

          <div className="space-y-2 sm:col-span-6">
            {candidates.map((candidate) => (
              <div
                key={candidate.title}
                className={
                  candidate.selected
                    ? "flex items-center justify-between gap-2 rounded-lg border-2 border-azure bg-navy-deep p-2.5 shadow-sm"
                    : "flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-navy-deep/40 p-2 opacity-55"
                }
              >
                <span className="truncate text-caption font-medium text-white">
                  {candidate.title}
                </span>
                <span
                  className={
                    candidate.selected
                      ? "shrink-0 rounded bg-gold px-1.5 py-0.5 text-[10px] font-bold text-navy"
                      : "shrink-0 text-[10px] text-white/50"
                  }
                >
                  {candidate.selected ? "Retenu [1]" : "Hors seuil"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-4 rounded-xl border border-white/15 bg-ink/90 p-5 shadow-lg">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-gold/40 bg-gold/15">
          <ShieldAlert className="size-5 text-gold" aria-hidden />
        </div>
        <div>
          <h4 className="mb-1 font-display text-small font-bold text-gold">
            Quand le corpus ne répond pas — Refus explicite
          </h4>
          <p className="text-[11px] leading-relaxed text-white/70">
            Si aucun passage ne dépasse le seuil de pertinence, l’agent ne
            répond pas : il indique que les documents ne soutiennent pas la
            question.
          </p>
        </div>
      </div>
    </div>
  );
}

import { BadgeCheck, Check, Scale, X } from "lucide-react";

const rows = [
  {
    criterion: "Source de la réponse",
    detail: "Ce qui soutient le texte",
    brh: "Document et page cités",
    other: "Références variables",
  },
  {
    criterion: "Traçabilité",
    detail: "Retrouver le passage",
    brh: "Passage localisé dans le PDF",
    other: "Lien parfois absent",
  },
  {
    criterion: "Périmètre",
    detail: "Ce que couvre l’outil",
    brh: "Publications BRH en français",
    other: "Connaissances générales",
  },
  {
    criterion: "Quand le corpus ne répond pas",
    detail: "Comportement attendu",
    brh: "Refus explicite",
    other: "Réponse possible sans source",
  },
];

export function ComparisonSection() {
  return (
    <section
      id="comparatif"
      className="relative scroll-mt-20 bg-surface py-24"
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-azure/20 bg-azure/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-teal">
            <Scale className="size-3.5" aria-hidden />
            Comparaison
          </div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-navy-ink sm:text-4xl">
            Recherche documentaire vs réponse générative
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
            Deux façons de répondre. Une seule garde le document et la page sous
            les yeux.
          </p>
        </div>

        <div className="space-y-4 md:hidden">
          {rows.map((row) => (
            <div
              key={row.criterion}
              className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
            >
              <div className="font-display text-small font-bold text-navy-ink">
                {row.criterion}
              </div>
              <div className="text-[11px] text-ink-muted">{row.detail}</div>
              <div className="mt-3 space-y-2">
                <div className="rounded-lg border border-azure/10 bg-azure/5 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal">
                    BRH Intelligence
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-caption font-semibold text-navy-ink">
                    <Check className="size-4 shrink-0 text-emerald" aria-hidden />
                    {row.brh}
                  </span>
                </div>
                <div className="rounded-lg border border-scarlet/10 bg-scarlet/5 p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    Assistant généraliste
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-caption text-ink-muted">
                    <X className="size-4 shrink-0 text-scarlet" aria-hidden />
                    {row.other}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-border bg-surface shadow-lg md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-1/3 bg-surface-alt/80 p-5 text-caption font-bold text-navy-ink">
                    Critère
                  </th>
                  <th className="w-1/3 border-r border-navy bg-navy p-5 text-caption font-bold text-white">
                    <span className="flex items-center gap-2">
                      <BadgeCheck className="size-4 text-gold" aria-hidden />
                      BRH Intelligence
                    </span>
                  </th>
                  <th className="w-1/3 bg-surface-alt p-5 text-caption font-semibold text-ink-muted">
                    Assistant généraliste
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-caption">
                {rows.map((row) => (
                  <tr key={row.criterion}>
                    <td className="p-5 font-semibold text-navy-ink">
                      {row.criterion}
                      <span className="mt-0.5 block text-[11px] font-normal text-ink-muted">
                        {row.detail}
                      </span>
                    </td>
                    <td className="border-r border-azure/10 bg-azure/5 p-5 font-semibold text-navy-ink">
                      <span className="flex items-center gap-1.5">
                        <Check className="size-4 shrink-0 text-emerald" aria-hidden />
                        {row.brh}
                      </span>
                    </td>
                    <td className="bg-scarlet/5 p-5 text-ink-muted">
                      <span className="flex items-center gap-1.5">
                        <X className="size-4 shrink-0 text-scarlet" aria-hidden />
                        {row.other}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-ink-muted">
          La réponse citée ne remplace pas la lecture du document original.
        </p>
      </div>
    </section>
  );
}

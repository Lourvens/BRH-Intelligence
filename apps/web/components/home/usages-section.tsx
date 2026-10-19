import {
  Landmark,
  LineChart,
  Newspaper,
  Scale,
  Users,
  type LucideIcon,
} from "lucide-react";

type Usage = {
  icon: LucideIcon;
  title: string;
  audience: string;
  body: string;
  query: string;
  left: string;
  right: string;
  tone: string;
};

const usages: Usage[] = [
  {
    icon: Landmark,
    title: "Banques & conformité",
    audience: "Compliance · audit interne · risques",
    body: "Retrouver les circulaires et avis qui encadrent une exigence prudentielle.",
    query: "Quelles circulaires mentionnent les réserves obligatoires ?",
    left: "Sources publiques",
    right: "Page citée",
    tone: "bg-azure/10 text-teal",
  },
  {
    icon: LineChart,
    title: "Économistes & chercheurs",
    audience: "Analyse macro · enseignement",
    body: "Retrouver une note de conjoncture ou un chiffre d’inflation avec sa source.",
    query: "Quel était le taux d’inflation annuel en novembre 2025 ?",
    left: "Séries IHSI",
    right: "Document source",
    tone: "bg-gold/20 text-gold-ink",
  },
  {
    icon: Scale,
    title: "Cabinets juridiques",
    audience: "Juristes · avocats · conseil",
    body: "Localiser un avis ou une circulaire et ouvrir le texte à la page citée.",
    query: "Quand le Bureau d’Information sur le Crédit a‑t‑il vu le jour ?",
    left: "Texte intégral",
    right: "Page citée",
    tone: "bg-navy/10 text-navy",
  },
  {
    icon: Newspaper,
    title: "Journalistes & bailleurs",
    audience: "Médias · observateurs",
    body: "Vérifier une affirmation dans les publications officielles, sans intermédiaire.",
    query:
      "Combien de coopératives d’épargne et de crédit la BRH supervise-t-elle ?",
    left: "Vérification",
    right: "Source primaire",
    tone: "bg-emerald/10 text-emerald",
  },
];

export function UsagesSection() {
  return (
    <section
      id="usages"
      className="relative scroll-mt-20 border-y border-border bg-surface-alt/70 py-24"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-azure/20 bg-azure/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-teal">
            <Users className="size-3.5" aria-hidden />
            Profils métiers
          </div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
            Cas d’usage &amp; profils
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
            Quatre profils, un même corpus de publications officielles.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {usages.map((usage) => {
            const Icon = usage.icon;

            return (
              <article
                key={usage.title}
                className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-7 shadow-sm transition-colors hover:border-teal"
              >
                <div>
                  <div className="mb-4 flex items-center gap-3.5">
                    <div
                      className={`grid size-12 shrink-0 place-items-center rounded-xl ${usage.tone}`}
                    >
                      <Icon className="size-6" aria-hidden />
                    </div>
                    <div>
                      <h3 className="font-display text-[17px] font-bold text-navy">
                        {usage.title}
                      </h3>
                      <span className="text-[11px] font-medium text-ink-muted">
                        {usage.audience}
                      </span>
                    </div>
                  </div>

                  <p className="mb-4 text-caption leading-relaxed text-ink-muted">
                    {usage.body}
                  </p>

                  <div className="rounded-xl border border-border bg-bg p-3 text-caption">
                    <span className="mb-1 block font-bold text-teal">
                      Exemple de requête :
                    </span>
                    <p className="italic text-ink">« {usage.query} »</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 font-mono text-[11px] text-ink-muted">
                  <span>{usage.left}</span>
                  <span className="font-bold text-teal">{usage.right}</span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { Ban, Clock, Languages, Unlink } from "lucide-react";

import { SectionHeading } from "./section-heading";

const limits = [
  {
    icon: Languages,
    title: "Corpus francophone",
    body: "Les documents sont en français. Le créole et l’anglais ne sont pas couverts.",
  },
  {
    icon: Clock,
    title: "Pas de données en direct",
    body: "Le corpus est une archive de publications, pas un flux de marché.",
  },
  {
    icon: Ban,
    title: "Pas de conseil",
    body: "Les réponses documentent ; elles ne recommandent pas.",
  },
  {
    icon: Unlink,
    title: "Pas de réponse sans source",
    body: "Si le corpus ne soutient pas la question, l’agent refuse explicitement.",
  },
];

export function LimitsSection() {
  return (
    <section id="limites" className="scroll-mt-20 border-b border-border bg-surface py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <SectionHeading
          className="mb-12"
          eyebrow="Périmètre"
          title="Ce que BRH Intelligence ne fait pas."
          intro="Un périmètre clair vaut mieux qu’une promesse floue."
          titleClassName="lg:text-[32px]"
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {limits.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-bg p-5"
              >
                <div className="mb-3 grid size-8 place-items-center rounded-lg bg-surface-alt text-navy">
                  <Icon className="size-4" aria-hidden />
                </div>
                <h3 className="mb-1.5 font-display text-small font-bold text-navy">
                  {item.title}
                </h3>
                <p className="text-[11px] leading-relaxed text-ink-muted">
                  {item.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

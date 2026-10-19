import {
  CreditCard,
  FileText,
  Landmark,
  LineChart,
  Users,
  type LucideIcon,
} from "lucide-react";

import { SectionHeading } from "./section-heading";

type QuestionCard = {
  topic: string;
  meta: string;
  icon: LucideIcon;
  question: string;
  answer: string;
  source: string;
  citation: string;
};

const questions: QuestionCard[] = [
  {
    topic: "Institution",
    meta: "Histoire statutaire",
    icon: Landmark,
    question: "Quand la BRH a‑t‑elle été créée ?",
    answer: "17 août 1979",
    source: "Les banques centrales : histoire et rôle",
    citation: "Janvier 2025 · p. 5",
  },
  {
    topic: "Crédit",
    meta: "Supervision bancaire",
    icon: CreditCard,
    question: "Quand le Bureau d’Information sur le Crédit a‑t‑il vu le jour ?",
    answer: "Avril 2013",
    source: "Importance du Bureau de Crédit dans l’Économie",
    citation: "p. 5",
  },
  {
    topic: "Inclusion financière",
    meta: "Régulation coopérative",
    icon: Users,
    question:
      "Combien de coopératives d’épargne et de crédit la BRH supervise-t-elle ?",
    answer: "97 coopératives",
    source: "Stratégie Nationale d’Inclusion Financière",
    citation: "p. 10",
  },
  {
    topic: "Politique monétaire",
    meta: "Indices macroéconomiques",
    icon: LineChart,
    question: "Quel était le taux d’inflation annuel en décembre 2020 ?",
    answer: "19,2 %",
    source: "Note sur la politique monétaire",
    citation: "1er trimestre 2021 · p. 6",
  },
];

export function QuestionsSection() {
  return (
    <section className="border-b border-border bg-surface-alt py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <SectionHeading
          className="mb-12"
          eyebrow="Exemples"
          title="Des questions que le corpus peut nourrir."
          intro="Quatre questions types, avec la réponse et la page qui la soutiennent."
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {questions.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.topic}
                className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-1.5 rounded-full bg-surface-alt px-2.5 py-1 text-caption font-semibold text-navy">
                      <Icon className="size-3.5" aria-hidden />
                      {item.topic}
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      {item.meta}
                    </span>
                  </div>

                  <h3 className="mb-3 text-body font-semibold text-ink">
                    « {item.question} »
                  </h3>

                  <div className="mb-4 rounded-lg bg-bg p-3">
                    <div className="mb-0.5 text-[11px] font-medium text-ink-muted">
                      Réponse sourcée
                    </div>
                    <div className="font-display text-xl font-bold text-navy">
                      {item.answer}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-border pt-3 text-caption text-ink-muted">
                  <FileText className="size-4 shrink-0 text-azure" aria-hidden />
                  <span className="truncate" title={`${item.source} · ${item.citation}`}>
                    {item.source} · {item.citation}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

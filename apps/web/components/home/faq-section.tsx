import {
  CircleHelp,
  Clock3,
  Database,
  Network,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";

const faqs: { icon: LucideIcon; question: string; answer: string }[] = [
  {
    icon: Database,
    question: "D’où proviennent les documents ?",
    answer:
      "Des publications officielles de la BRH publiées sur brh.ht et des séries de l’IHSI. Le corpus est en français ; aucun contenu externe n’est ajouté.",
  },
  {
    icon: ShieldAlert,
    question: "Comment l’agent traite-t-il une question sans réponse ?",
    answer:
      "Il recherche des passages dans le corpus. Si aucun passage ne dépasse le seuil de pertinence, il refuse explicitement au lieu d’inventer une réponse.",
  },
  {
    icon: Clock3,
    question: "Le corpus est-il mis à jour en temps réel ?",
    answer:
      "Non. L’inventaire est une archive de publications. Les nouveaux documents sont ajoutés lors des mises à jour du corpus ; il n’y a pas de flux temps réel.",
  },
  {
    icon: Network,
    question: "Peut-on interroger le corpus depuis un autre outil ?",
    answer:
      "Le serveur MCP expose le même service de recherche que l’interface web. Les intégrations institutionnelles restent à construire.",
  },
];

export function FaqSection() {
  return (
    <section
      id="faq"
      className="relative scroll-mt-20 border-y border-border bg-surface-alt/70 py-24"
    >
      <div className="mx-auto max-w-4xl px-5 sm:px-8">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-azure/20 bg-azure/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-teal">
            <CircleHelp className="size-3.5" aria-hidden />
            FAQ
          </div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
            Questions fréquentes
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-muted">
            Données, périmètre et méthode.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.question}
                className="rounded-2xl border border-border bg-surface p-6 shadow-sm"
              >
                <h3 className="flex items-start justify-between gap-4 font-display text-body font-bold text-navy">
                  <span>{item.question}</span>
                  <Icon className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden />
                </h3>
                <p className="mt-3 text-caption leading-relaxed text-ink-muted">
                  {item.answer}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

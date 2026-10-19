import {
  Check,
  FileSearch,
  LocateFixed,
  Search,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";

type PipelineStep = {
  number: string;
  icon: LucideIcon;
  title: string;
  body: string;
  note: string;
  tone: string;
};

const steps: PipelineStep[] = [
  {
    number: "01",
    icon: FileSearch,
    title: "Collecte & transcription",
    body: "Les PDF publiés sur brh.ht sont inventoriés. Les pages sans couche texte passent par OCR, page par page.",
    note: "Inventaire + OCR",
    tone: "bg-azure/10 text-teal border-azure/20",
  },
  {
    number: "02",
    icon: Search,
    title: "Recherche sémantique",
    body: "Les passages les plus proches de la question sont retrouvés dans le corpus, avec leur document et leur page.",
    note: "Passages candidats",
    tone: "bg-navy/10 text-navy border-navy/15",
  },
  {
    number: "03",
    icon: LocateFixed,
    title: "Ancrage page par page",
    body: "Chaque extrait conserve le document, la page et le texte publié. La citation ouvre le PDF au bon endroit.",
    note: "Document + page",
    tone: "bg-gold/20 text-gold-ink border-gold/40",
  },
  {
    number: "04",
    icon: ShieldCheck,
    title: "Réponse & refus",
    body: "La réponse est rédigée à partir des passages retenus. Si aucun passage ne soutient la question, l’agent refuse explicitement.",
    note: "Source citée / refus",
    tone: "bg-emerald/10 text-emerald border-emerald/20",
  },
];

export function PipelineSection() {
  return (
    <section
      id="pipeline"
      className="scroll-mt-20 border-y border-border bg-surface-alt/70 py-24"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-azure/20 bg-azure/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-teal">
            <Workflow className="size-3.5" aria-hidden />
            Architecture &amp; pipeline
          </div>
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-navy sm:text-4xl">
            Comment fonctionne BRH Intelligence
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
            De l’inventaire des PDF à la réponse citée, quatre étapes
            conservent le document et la page sous les yeux.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div
                key={step.number}
                className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <span
                      className={`grid size-10 place-items-center rounded-xl border font-mono text-caption font-bold ${step.tone}`}
                    >
                      {step.number}
                    </span>
                    <Icon className="size-6 text-ink-muted" aria-hidden />
                  </div>
                  <h3 className="mb-2 font-display text-body font-bold text-navy">
                    {step.title}
                  </h3>
                  <p className="text-caption leading-relaxed text-ink-muted">
                    {step.body}
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-1.5 border-t border-border pt-3 font-mono text-[11px] text-teal">
                  <Check className="size-3.5" aria-hidden />
                  {step.note}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { BookOpen, Cpu, ScanLine } from "lucide-react";

import { RetrievalDiagram } from "./method/retrieval-diagram";

const steps = [
  {
    number: "01",
    title: "Vous posez la question",
    body: "En français, sans syntaxe à apprendre.",
  },
  {
    number: "02",
    title: "Le corpus est interrogé",
    body: "Les passages les plus proches sont retrouvés, avec leur document et leur page.",
  },
  {
    number: "03",
    title: "La réponse est rédigée",
    body: "À partir des passages retenus, avec des repères [1], [2].",
  },
  {
    number: "04",
    title: "La source est localisée",
    body: "Chaque repère renvoie au document et à la page exacte.",
  },
];

const underTheHood = [
  {
    icon: BookOpen,
    title: "Page par page",
    body: "Chaque page garde son numéro, pour une citation qui ouvre le PDF au bon endroit.",
  },
  {
    icon: ScanLine,
    title: "OCR ciblé",
    body: "Les pages sans couche texte sont transcrites ; le pipeline décide page par page.",
  },
  {
    icon: Cpu,
    title: "Un seul cœur",
    body: "Le site et le serveur MCP partagent le même service de recherche.",
  },
];

export function MethodSection() {
  return (
    <section
      id="methode"
      className="relative scroll-mt-20 overflow-hidden bg-navy-deep py-24 text-white"
    >
      <div
        aria-hidden
        className="dot-grid-light pointer-events-none absolute inset-0 opacity-30"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mb-16 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1">
            <span className="size-2 rounded-full bg-gold" />
            <span className="eyebrow text-gold">La méthode</span>
          </div>
          <h2 className="mb-4 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[36px]">
            Une réponse, pas une boîte noire.
          </h2>
          <p className="text-base leading-relaxed text-white/70">
            Chaque réponse est construite à partir de passages retrouvés dans
            le corpus. Les étapes sont visibles, et chaque affirmation renvoie à
            sa page.
          </p>
        </div>

        <div className="mb-16 grid grid-cols-1 items-start gap-10 lg:grid-cols-12">
          <div className="relative space-y-8 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-0.5 before:bg-white/20 lg:col-span-5">
            {steps.map((step, index) => (
              <div key={step.number} className="relative flex items-start gap-5 pl-2">
                <div
                  className={
                    index === steps.length - 1
                      ? "z-10 grid size-8 shrink-0 place-items-center rounded-full bg-gold text-caption font-bold text-navy"
                      : "z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 border-azure bg-navy text-caption font-bold text-white"
                  }
                >
                  {step.number}
                </div>
                <div>
                  <h3 className="mb-1 font-display text-small font-bold text-white">
                    {step.title}
                  </h3>
                  <p className="text-[11px] leading-relaxed text-white/70">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-7">
            <RetrievalDiagram />
          </div>
        </div>

        <div className="border-t border-white/15 pt-8">
          <div className="mb-4 text-[11px] font-bold uppercase tracking-wider text-gold">
            Sous le capot
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {underTheHood.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                >
                  <h4 className="mb-2 flex items-center gap-2 font-display text-small font-bold text-white">
                    <Icon className="size-4 text-azure" aria-hidden />
                    {item.title}
                  </h4>
                  <p className="text-[11px] leading-relaxed text-white/70">
                    {item.body}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

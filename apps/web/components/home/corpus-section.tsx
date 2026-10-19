import { FileText, Landmark, Library, ScrollText, TrendingUp } from "lucide-react";
import Image from "next/image";

const metrics = [
  { value: "1\u202F169", label: "PDF recensés" },
  { value: "34", label: "Documents transcrits" },
  { value: "1\u202F192", label: "Pages profilées" },
];

const families = [
  {
    icon: ScrollText,
    title: "Circulaires et avis",
    type: "Textes",
    body: "Textes réglementaires, avis et communiqués publiés par la Banque de la République d’Haïti.",
    tone: "bg-azure/10 text-teal",
  },
  {
    icon: TrendingUp,
    title: "Notes de conjoncture & inflation",
    type: "Séries",
    body: "Notes mensuelles, indices des prix et séries statistiques publiées par l’IHSI.",
    tone: "bg-navy/10 text-navy",
  },
  {
    icon: FileText,
    title: "Rapports & bilans",
    type: "Rapports",
    body: "Rapports annuels, bulletins et documents d’information de la Banque.",
    tone: "bg-emerald/10 text-emerald",
  },
];

export function CorpusSection() {
  return (
    <section
      id="corpus"
      className="relative scroll-mt-20 overflow-hidden bg-surface py-24"
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/50 bg-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold-ink">
              <Library className="size-3.5" aria-hidden />
              Corpus documentaire
            </div>
            <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-navy sm:text-4xl">
              Explorer le corpus, page par page.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-muted sm:text-lg">
              Les publications monétaires, légales et économiques recensées sur
              brh.ht, avec leur document et leur page. L’archive couvre
              2018—2026 ; la transcription OCR progresse document par document.
            </p>

            <div className="my-8 grid grid-cols-3 gap-4 rounded-2xl border border-border bg-bg p-4">
              {metrics.map((metric, index) => (
                <div
                  key={metric.label}
                  className={
                    index === 1
                      ? "border-x border-border px-2 text-center sm:px-4 sm:text-left"
                      : "text-center sm:text-left"
                  }
                >
                  <span className="font-display text-2xl font-extrabold text-navy sm:text-3xl">
                    {metric.value}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    {metric.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3.5">
              {families.map((family) => {
                const Icon = family.icon;

                return (
                  <div
                    key={family.title}
                    className="flex items-start gap-3.5 rounded-xl border border-border bg-bg/60 p-4 transition-colors hover:border-teal"
                  >
                    <div
                      className={`grid size-9 shrink-0 place-items-center rounded-lg ${family.tone}`}
                    >
                      <Icon className="size-4" aria-hidden />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-caption font-bold text-navy">
                          {family.title}
                        </h3>
                        <span className="font-mono text-[11px] text-ink-muted">
                          {family.type}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-ink-muted">
                        {family.body}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative lg:col-span-5">
            <div className="relative rounded-3xl border border-border bg-gradient-to-tr from-surface-alt via-bg to-azure/5 p-3 shadow-xl">
              <div className="overflow-hidden rounded-2xl border border-white/80 bg-surface shadow-inner">
                <Image
                  src="/brh-corpus-archive.jpg"
                  alt="Bibliothèque documentaire de la Banque de la République d’Haïti"
                  width={1024}
                  height={765}
                  className="h-auto w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                />
              </div>
              <div className="absolute -bottom-5 right-6 flex items-center gap-3 rounded-xl border border-border bg-surface/95 px-4 py-2.5 shadow-lg backdrop-blur-md">
                <div className="grid size-8 place-items-center rounded-lg bg-navy text-gold">
                  <Landmark className="size-4" aria-hidden />
                </div>
                <div>
                  <span className="block text-caption font-bold text-navy">
                    Archive documentaire
                  </span>
                  <span className="text-[10px] text-ink-muted">
                    Chaque page garde son document et son numéro.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

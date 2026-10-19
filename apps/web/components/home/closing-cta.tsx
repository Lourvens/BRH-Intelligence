import { BookOpen, Search } from "lucide-react";

export function ClosingCta() {
  return (
    <section className="bg-bg py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-navy-deep bg-navy p-10 text-center text-white shadow-2xl sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-20 size-80 rounded-full border border-white/10"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 size-96 rounded-full border border-gold/15"
          />

          <div className="relative z-10 mx-auto max-w-2xl">
            <span className="eyebrow mb-3 block text-gold">
              BRH Intelligence
            </span>
            <h2 className="mb-4 font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-[38px]">
              La réponse est dans le document.
            </h2>
            <p className="mb-8 text-small leading-relaxed text-white/80 sm:text-base">
              Retrouvez la page qui soutient chaque réponse, puis explorez les
              publications officielles de la Banque de la République d’Haïti.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-xl bg-gold px-7 py-3.5 text-small font-bold text-navy shadow-lg transition-colors hover:bg-white"
              >
                <Search className="size-4" aria-hidden />
                Voir une réponse citée
              </a>
              <a
                href="#corpus"
                className="inline-flex items-center gap-2 rounded-xl border border-white/40 px-7 py-3.5 text-small font-medium text-white transition-colors hover:bg-white/10"
              >
                <BookOpen className="size-4" aria-hidden />
                Explorer le corpus
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { ArrowRight, BookOpen, Check, ShieldAlert } from "lucide-react";

export function AccessCta() {
  return (
    <section id="demande-acces" className="scroll-mt-20 bg-surface py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border-2 border-gold/40 bg-gradient-to-br from-navy via-navy-deep to-blue p-8 shadow-2xl sm:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-gold/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-32 size-96 rounded-full bg-azure/20 blur-3xl"
          />

          <div className="relative z-10 max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold">
              <BookOpen className="size-3.5" aria-hidden />
              Accès à la démonstration
            </div>
            <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              Prêt à explorer les publications de la BRH ?
            </h2>
            <p className="mt-5 text-base leading-relaxed text-white/80 sm:text-lg">
              Voir une réponse citée, puis parcourir l’archive. Le corpus est en
              français ; chaque réponse renvoie au document et à sa page.
            </p>

            <div className="mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-gold px-8 py-4 text-[15px] font-bold text-navy shadow-lg shadow-navy/20 transition-colors hover:bg-white"
              >
                Voir une réponse citée
                <ArrowRight className="size-4" aria-hidden />
              </a>
              <a
                href="#corpus"
                className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-white/30 bg-white/10 px-7 py-4 text-[15px] font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20"
              >
                <BookOpen className="size-4" aria-hidden />
                Explorer le corpus
              </a>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-caption text-white/70">
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-gold" aria-hidden />
                Corpus francophone
              </span>
              <span aria-hidden className="hidden text-white/30 sm:inline">
                •
              </span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-3.5 text-gold" aria-hidden />
                Citations page par page
              </span>
              <span aria-hidden className="hidden text-white/30 sm:inline">
                •
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="size-3.5 text-gold" aria-hidden />
                Refus explicite
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

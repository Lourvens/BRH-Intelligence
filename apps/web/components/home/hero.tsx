import { ArrowRight, Check, MessageSquare, PlayCircle, Sparkles } from "lucide-react";

import { heroCopy } from "./hero/data";
import { HeroShowcase } from "./hero/hero-showcase";
import { HeroTrust } from "./hero/hero-trust";

export function Hero() {
  return (
    <section
      id="apercu"
      className="relative scroll-mt-20 overflow-hidden border-b border-border pb-20 pt-16 sm:pt-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-[640px] w-[1100px] -translate-x-1/2 bg-gradient-to-b from-azure/10 via-surface-alt/40 to-transparent blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-40 size-96 rounded-full bg-azure/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-64 size-[450px] rounded-full bg-gold/10 blur-3xl"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center pb-8 pt-4 text-center sm:pb-12">
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/95 px-3.5 py-1.5 shadow-sm">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-azure opacity-70" />
              <span className="relative inline-flex size-2 rounded-full bg-teal" />
            </span>
            <Sparkles className="size-3 text-teal" aria-hidden />
            <span className="text-[10px] font-bold uppercase tracking-wider text-navy-ink sm:text-[11px]">
              {heroCopy.eyebrow}
            </span>
          </div>

          <h1 className="font-display text-4xl font-extrabold leading-[1.12] tracking-tight text-navy-ink sm:text-5xl lg:text-[58px]">
            {heroCopy.titleLead}
            <br />
            <span className="bg-gradient-to-r from-navy-ink via-teal to-navy-ink bg-clip-text text-transparent">
              {heroCopy.titleAccent}
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-[19px]">
            {heroCopy.intro}
          </p>

          <div className="mt-9 flex w-full max-w-2xl flex-col items-center justify-center gap-3.5 sm:flex-row">
            <a
              href="#corpus"
              className="group inline-flex w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-xl bg-navy px-7 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-navy/20 transition-all duration-200 hover:bg-navy-deep hover:shadow-xl sm:w-auto"
            >
              {heroCopy.primaryCta}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </a>
            <a
              href="#demo"
              className="inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-border bg-surface px-6 py-3.5 text-[15px] font-semibold text-ink shadow-sm transition-colors hover:border-navy-ink/25 hover:bg-surface-alt sm:w-auto"
            >
              <PlayCircle className="size-5 text-teal" aria-hidden />
              {heroCopy.secondaryCta}
            </a>
            <a
              href="/assistant"
              className="group inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-azure/40 bg-azure/5 px-6 py-3.5 text-[15px] font-semibold text-navy-ink shadow-sm transition-colors hover:border-azure/70 hover:bg-azure/10 sm:w-auto"
            >
              <MessageSquare className="size-4 text-teal" aria-hidden />
              {heroCopy.assistantCta}
              <ArrowRight className="size-4 text-teal transition-transform group-hover:translate-x-0.5" aria-hidden />
            </a>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-caption font-medium text-ink-muted">
            {heroCopy.assurances.map((item, index) => (
              <span key={item} className="flex items-center gap-1">
                {index > 0 ? (
                  <span aria-hidden className="mr-3 hidden text-border sm:inline">
                    •
                  </span>
                ) : null}
                <Check className="size-3 text-emerald" aria-hidden />
                {item}
              </span>
            ))}
          </div>
        </div>

        <HeroShowcase />
        <HeroTrust />
      </div>
    </section>
  );
}

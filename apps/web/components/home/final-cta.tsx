import { ArrowRight } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { finalCta } from "@/lib/content/home";

export function FinalCta() {
  return (
    <section className="pb-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="overflow-hidden rounded-card bg-navy-deep px-6 py-10 sm:px-10 sm:py-14 lg:flex lg:items-center lg:justify-between lg:gap-12">
          <div className="max-w-xl">
            <p className="eyebrow text-white/60">{finalCta.eyebrow}</p>
            <h2 className="mt-4 font-display text-title font-semibold tracking-[-0.02em] text-white sm:text-headline">
              {finalCta.title}
            </h2>
            <p className="mt-3 text-small leading-relaxed text-white/70 sm:text-body">
              {finalCta.intro}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:shrink-0">
            <ButtonLink href="#apercu" variant="gold" size="lg">
              {finalCta.primary}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink
              href="#corpus"
              variant="secondary"
              size="lg"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              {finalCta.secondary}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

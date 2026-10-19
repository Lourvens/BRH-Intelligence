import { ArrowRight, Check } from "lucide-react";

import { AgentDemo } from "@/components/home/agent-demo";
import { ButtonLink } from "@/components/ui/button";
import { hero } from "@/lib/content/home";

export function Hero() {
  const [accentLead, accentTail] = hero.titleAccent.split("la page");

  return (
    <section aria-labelledby="titre-accueil" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-14 px-5 pb-16 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[0.94fr_1.06fr] lg:items-center lg:gap-12 lg:pb-24 lg:pt-24">
        <div>
          <p className="eyebrow flex items-center gap-2 text-ink-muted">
            <span className="size-1.5 rounded-full bg-gold-ink" aria-hidden />
            {hero.eyebrow}
          </p>

          <h1
            id="titre-accueil"
            className="mt-5 font-display text-headline font-bold tracking-[-0.035em] text-navy sm:text-display"
          >
            {hero.titleLead}
            <span className="mt-2 block">
              {accentLead}
              <span className="underline decoration-gold decoration-[0.12em] underline-offset-[0.2em]">
                la page
              </span>
              {accentTail}
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-body leading-relaxed text-ink-muted sm:text-lead">
            {hero.intro}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="#apercu" size="lg">
              {hero.primaryCta}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="#corpus" size="lg" variant="secondary">
              {hero.secondaryCta}
            </ButtonLink>
          </div>

          <p className="mt-3 text-micro text-ink-muted">{hero.note}</p>

          <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-micro font-medium text-ink-muted">
            {hero.assurances.map((item) => (
              <li key={item} className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative lg:pl-4">
          <AgentDemo />
        </div>
      </div>
    </section>
  );
}

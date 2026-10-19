import {
  LayersIcon,
  PageSourceIcon,
  PlugIcon,
  QuoteMarkIcon,
  RefusalGateIcon,
  SearchBeamIcon,
  SparkIcon,
} from "@/components/illustrations/icons";
import { RetrievalFan } from "@/components/illustrations/retrieval-fan";
import { SectionHeading } from "@/components/home/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { method } from "@/lib/content/home";

const stepIcons = [QuoteMarkIcon, SearchBeamIcon, SparkIcon, PageSourceIcon];
const underpinningIcons = [PageSourceIcon, LayersIcon, PlugIcon];

export function MethodSection() {
  return (
    <section
      id="methode"
      aria-labelledby="titre-methode"
      className="scroll-mt-20 border-y border-border bg-bg"
    >
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-16">
          <div>
            <Reveal>
              <SectionHeading
                titleId="titre-methode"
                eyebrow={method.eyebrow}
                title={method.title}
                intro={method.intro}
              />
            </Reveal>

            <ol className="mt-10">
              {method.steps.map((step, index) => {
                const Icon = stepIcons[index] ?? SearchBeamIcon;

                return (
                  <li key={step.number} className="relative flex gap-4">
                    {index < method.steps.length - 1 ? (
                      <span
                        aria-hidden
                        className="absolute bottom-0 left-5 top-11 w-px bg-border"
                      />
                    ) : null}

                    <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-surface text-navy">
                      <Icon className="size-5" />
                    </span>

                    <div className="pb-7">
                      <div className="flex items-baseline gap-2">
                        <span className="text-micro font-semibold tracking-[0.08em] text-ink-muted">
                          {step.number}
                        </span>
                        <h3 className="font-display text-body font-semibold text-navy">
                          {step.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-small leading-relaxed text-ink-muted">
                        {step.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <Reveal
            delay={0.08}
            className="rounded-card border border-border bg-surface p-4 shadow-card sm:p-6"
          >
            <RetrievalFan />
            <p className="mt-4 border-t border-border pt-4 text-center text-micro text-ink-muted">
              {method.illustrationCaption}
            </p>
          </Reveal>
        </div>

        <Reveal className="mt-8">
          <div className="rounded-card border border-border bg-surface p-6 sm:p-8 lg:flex lg:items-center lg:gap-8">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-alt text-slate">
              <RefusalGateIcon className="size-6" />
            </span>
            <div className="mt-4 lg:mt-0">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-body font-semibold text-navy">
                  {method.refusalTitle}
                </h3>
                <span className="rounded-full border border-border bg-bg px-2.5 py-1 text-micro font-medium text-ink-muted">
                  {method.refusalBadge}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-small leading-relaxed text-ink-muted">
                {method.refusalBody}
              </p>
            </div>
          </div>
        </Reveal>

        <div className="mt-12">
          <p className="eyebrow flex items-center gap-2 text-ink-muted">
            <span className="size-1.5 rounded-full bg-gold-ink" aria-hidden />
            {method.underpinningsTitle}
          </p>

          <Stagger className="mt-6 grid gap-4 md:grid-cols-3">
            {method.underpinnings.map((item, index) => {
              const Icon = underpinningIcons[index] ?? LayersIcon;

              return (
                <StaggerItem key={item.title}>
                  <div className="h-full rounded-card border border-border bg-surface p-6">
                    <span className="grid size-10 place-items-center rounded-xl bg-surface-alt text-navy">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-5 font-display text-body font-semibold text-navy">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-small leading-relaxed text-ink-muted">
                      {item.body}
                    </p>
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </div>
      </div>
    </section>
  );
}

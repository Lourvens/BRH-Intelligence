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
import { RetrievalFanMobile } from "@/components/illustrations/retrieval-fan-mobile";
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
      className="scroll-mt-20 bg-navy-deep"
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
                tone="dark"
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
                        className="absolute bottom-0 left-5 top-11 w-px bg-white/15"
                      />
                    ) : null}

                    <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 text-white">
                      <Icon className="size-5" />
                    </span>

                    <div className="pb-7">
                      <div className="flex items-baseline gap-2">
                        <span className="text-micro font-semibold tracking-[0.08em] text-white/45">
                          {step.number}
                        </span>
                        <h3 className="font-display text-body font-semibold text-white">
                          {step.title}
                        </h3>
                      </div>
                      <p className="mt-1 text-small leading-relaxed text-white/65">
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
            className="rounded-card border border-white/10 bg-white/5 p-4 sm:p-6"
          >
            <div className="hidden sm:block">
              <RetrievalFan tone="dark" />
            </div>
            <div className="sm:hidden">
              <RetrievalFanMobile />
            </div>
            <p className="mt-4 border-t border-white/10 pt-4 text-center text-micro text-white/50">
              {method.illustrationCaption}
            </p>
          </Reveal>
        </div>

        <Reveal className="mt-8">
          <div className="rounded-card border border-white/10 bg-white/5 p-6 sm:p-8 lg:flex lg:items-center lg:gap-8">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white/10 text-azure">
              <RefusalGateIcon className="size-6" />
            </span>
            <div className="mt-4 lg:mt-0">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-display text-body font-semibold text-white">
                  {method.refusalTitle}
                </h3>
                <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-micro font-medium text-white/60">
                  {method.refusalBadge}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-small leading-relaxed text-white/65">
                {method.refusalBody}
              </p>
            </div>
          </div>
        </Reveal>

        <div className="mt-12">
          <p className="eyebrow flex items-center gap-2 text-white/60">
            <span className="size-1.5 rounded-full bg-gold" aria-hidden />
            {method.underpinningsTitle}
          </p>

          <Stagger className="mt-6 grid gap-4 md:grid-cols-3">
            {method.underpinnings.map((item, index) => {
              const Icon = underpinningIcons[index] ?? LayersIcon;

              return (
                <StaggerItem key={item.title}>
                  <div className="h-full rounded-card border border-white/10 bg-white/5 p-6">
                    <span className="grid size-10 place-items-center rounded-xl bg-white/10 text-azure">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-5 font-display text-body font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-small leading-relaxed text-white/65">
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

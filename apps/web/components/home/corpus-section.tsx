import { BookStackIcon } from "@/components/illustrations/icons";
import { DocumentStack } from "@/components/illustrations/document-stack";
import { InflationChart } from "@/components/illustrations/inflation-chart";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/home/section-heading";
import { corpus } from "@/lib/content/home";

export function CorpusSection() {
  return (
    <section
      id="corpus"
      aria-labelledby="titre-corpus"
      className="scroll-mt-20 border-y border-border bg-surface"
    >
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <Reveal>
          <SectionHeading
            titleId="titre-corpus"
            eyebrow={corpus.eyebrow}
            title={corpus.title}
            intro={corpus.intro}
          />
        </Reveal>

        <div className="mt-12 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Reveal className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
            <InflationChart />
          </Reveal>

          <div className="flex flex-col gap-4">
            <Reveal
              delay={0.05}
              className="rounded-card border border-border bg-surface-alt p-5 sm:p-6"
            >
              <DocumentStack className="mx-auto" />
            </Reveal>

            <Reveal
              delay={0.1}
              className="rounded-card border border-border bg-surface p-5 sm:p-6"
            >
              <p className="flex items-center gap-2 text-caption font-medium text-ink-muted">
                <BookStackIcon className="size-4 text-navy" />
                {corpus.familiesTitle}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {corpus.families.map((family) => (
                  <li
                    key={family}
                    className="rounded-full border border-border bg-bg px-3 py-1 text-micro font-medium text-ink-muted"
                  >
                    {family}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>

        <Reveal className="mt-10">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-border pt-8 md:grid-cols-4">
            {corpus.stats.map((stat) => (
              <div key={stat.label}>
                <dt className="font-display text-[1.75rem] font-bold leading-none tracking-[-0.02em] text-navy">
                  {stat.value}
                </dt>
                <dd className="mt-2 text-small font-medium text-ink">
                  {stat.label}
                </dd>
                <dd className="mt-1 text-micro text-ink-muted">{stat.note}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <p className="mt-6 text-micro text-ink-muted">{corpus.statsSource}</p>
      </div>
    </section>
  );
}

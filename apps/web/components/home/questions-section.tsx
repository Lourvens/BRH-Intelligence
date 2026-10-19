import type { ComponentType, SVGProps } from "react";

import {
  BookStackIcon,
  PageSourceIcon,
  ShieldCheckIcon,
  SparkIcon,
} from "@/components/illustrations/icons";
import { SectionHeading } from "@/components/home/section-heading";
import { Reveal } from "@/components/motion/reveal";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { questions, questionsSection } from "@/lib/content/home";

const topicIcons: Record<
  string,
  ComponentType<SVGProps<SVGSVGElement>>
> = {
  Institution: BookStackIcon,
  Crédit: PageSourceIcon,
  "Inclusion financière": ShieldCheckIcon,
  "Politique monétaire": SparkIcon,
};

export function QuestionsSection() {
  return (
    <section
      id="questions"
      aria-labelledby="titre-questions"
      className="scroll-mt-20 border-y border-border bg-surface-alt"
    >
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24">
        <Reveal>
          <SectionHeading
            titleId="titre-questions"
            eyebrow={questionsSection.eyebrow}
            title={questionsSection.title}
            intro={questionsSection.intro}
          />
        </Reveal>

        <Stagger className="mt-12 grid gap-4 md:grid-cols-2">
          {questions.map((item) => {
            const Icon = topicIcons[item.topic] ?? PageSourceIcon;

            return (
              <StaggerItem key={item.question}>
                <article className="group flex h-full flex-col rounded-card border border-border bg-surface p-6 transition-colors hover:border-navy/20">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-surface-alt px-3 py-1 text-micro font-medium text-ink-muted">
                      {item.topic}
                    </span>
                    <Icon className="size-5 text-navy/30 transition-colors group-hover:text-navy/60" />
                  </div>

                  <h3 className="mt-5 font-display text-lead font-semibold leading-snug tracking-[-0.01em] text-navy">
                    {item.question}
                  </h3>

                  <p className="mt-5 font-display text-[1.75rem] font-bold leading-none tracking-[-0.02em] text-navy">
                    {item.answer}
                  </p>
                  <p className="mt-2 text-small leading-relaxed text-ink-muted">
                    {item.detail}
                  </p>

                  <div className="mt-auto flex items-center gap-2 border-t border-border pt-4 text-micro text-ink-muted">
                    <PageSourceIcon className="size-4 shrink-0 text-navy" />
                    <span className="min-w-0 truncate">
                      {item.source}
                      {item.date ? ` · ${item.date}` : ""}
                    </span>
                    <span className="ml-auto shrink-0">p.&nbsp;{item.page}</span>
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      </div>
    </section>
  );
}

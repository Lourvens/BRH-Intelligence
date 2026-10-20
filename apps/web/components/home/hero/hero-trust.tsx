import {
  BarChart3,
  BookOpen,
  FileText,
  Globe2,
  Landmark,
  ScanLine,
  Users,
  type LucideIcon,
} from "lucide-react";

import { heroMetrics, heroTags } from "./data";

const tagIcons: LucideIcon[] = [Landmark, BarChart3, Globe2, Users];
const metricIcons: LucideIcon[] = [FileText, ScanLine, BookOpen];

export function HeroTrust() {
  return (
    <div className="mx-auto mt-16 max-w-5xl border-t border-border pt-10 sm:mt-20">
      <p className="mb-8 text-center text-[11px] font-semibold uppercase tracking-widest text-ink-muted">
        Sources publiques · repères du corpus
      </p>

      <div className="grid grid-cols-2 items-center gap-4 text-center md:grid-cols-4">
        {heroTags.map((tag, index) => {
          const Icon = tagIcons[index];

          return (
            <div
              key={tag.title}
              className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface/70 p-3.5 shadow-sm transition-colors hover:bg-surface"
            >
              <Icon className="mb-1 size-5 text-navy-ink" aria-hidden />
              <span className="font-display text-caption font-bold text-navy-ink">
                {tag.title}
              </span>
              <span className="text-[10px] text-ink-muted">{tag.detail}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {heroMetrics.map((metric, index) => {
          const Icon = metricIcons[index];

          return (
            <div
              key={metric.label}
              className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-6 shadow-sm"
            >
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-surface-alt text-teal">
                <Icon className="size-5" aria-hidden />
              </div>
              <div>
                <div className="font-display text-3xl font-extrabold text-navy-ink">
                  {metric.value}
                </div>
                <div className="mt-0.5 font-display text-caption font-semibold text-ink">
                  {metric.label}
                </div>
                <p className="mt-1 text-[11px] text-ink-muted">
                  {metric.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

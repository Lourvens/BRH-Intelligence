"use client";

import { Search, SlidersHorizontal, Zap } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  heroCopy,
  heroExamples,
  heroFilters,
  type HeroPreset,
} from "./data";

export function HeroSearch({
  preset,
  activeFilter,
  onFilter,
  onExample,
}: {
  preset: HeroPreset;
  activeFilter: string;
  onFilter: (id: string) => void;
  onExample: (id: string) => void;
}) {
  return (
    <div className="mx-auto mb-12 max-w-4xl">
      <div className="relative rounded-2xl border border-azure/20 bg-surface p-2 shadow-xl sm:p-3">
        <div className="mb-2 flex items-center gap-2 overflow-x-auto border-b border-border px-2 pb-3 pt-1 [scrollbar-width:none] sm:px-3 [&::-webkit-scrollbar]:hidden">
          <span className="mr-1 flex shrink-0 items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            <SlidersHorizontal className="size-3 text-azure" aria-hidden />
            Filtres :
          </span>

          {heroFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-pressed={activeFilter === filter.id}
              onClick={() => onFilter(filter.id)}
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 text-caption font-medium transition-colors",
                activeFilter === filter.id
                  ? "bg-navy font-semibold text-white shadow-sm"
                  : "bg-surface-alt text-navy hover:bg-border/70",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 px-2 py-2 sm:px-3">
          <Search className="size-6 shrink-0 text-azure" aria-hidden />

          <div className="min-w-0 flex-1 text-left">
            <span className="block text-caption font-medium text-ink-muted">
              {heroCopy.searchLabel}
            </span>
            <span className="mt-0.5 block text-small font-semibold leading-snug text-navy sm:text-body">
              « {preset.question} »
            </span>
          </div>

          <span className="hidden items-center gap-1 rounded-lg border border-border bg-surface-alt px-2.5 py-1 font-mono text-[11px] text-ink-muted sm:flex">
            <span className="font-bold">⌘</span>
            <span>K</span>
          </span>

          <a
            href="#demo"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-navy px-3 py-2.5 text-caption font-semibold text-white shadow-md transition-colors hover:bg-navy-deep sm:px-5 sm:py-3 sm:text-small"
          >
            <Zap className="size-4 text-gold" aria-hidden />
            <span>Interroger</span>
          </a>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-2 text-caption text-ink-muted">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-navy">{heroCopy.quickLabel}</span>

          {heroExamples.map((example, index) => (
            <span key={example.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onExample(example.id)}
                className="text-left underline decoration-azure/40 decoration-1 underline-offset-4 transition-colors hover:text-azure"
              >
                « {example.label} »
              </button>
              {index < heroExamples.length - 1 ? (
                <span aria-hidden className="text-border">
                  •
                </span>
              ) : null}
            </span>
          ))}
        </div>

        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald">
          <span className="size-2 rounded-full bg-emerald" />
          {heroCopy.indexNote}
        </span>
      </div>
    </div>
  );
}

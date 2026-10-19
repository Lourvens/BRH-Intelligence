"use client";

import { motion } from "framer-motion";
import { Check, FileCheck2, Search, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { hero } from "@/lib/content/home";
import { cn } from "@/lib/utils";

import { SourceDocument } from "./source-document";
import { SourcedAnswer } from "./sourced-answer";
import { presets } from "./query-presets";

/**
 * The interactive demo stage: pick a preset question, see the sourced answer
 * and the document page it comes from. All content is real corpus material.
 */
export function AgentConsole() {
  const [selectedId, setSelectedId] = useState("inflation");
  const current = presets.find((preset) => preset.id === selectedId) ?? presets[0];

  return (
    <motion.div
      id="apercu"
      initial={{ opacity: 0, y: 25 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.3 }}
      className="mt-12 select-none"
    >
      <div className="relative mx-auto max-w-4xl rounded-3xl border border-border/90 bg-surface/95 p-4 shadow-2xl backdrop-blur-xl sm:p-7">
        <div className="pointer-events-none absolute -inset-px rounded-3xl bg-azure/[0.03]" />

        {/* Preset questions */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-4">
          <span className="text-micro font-semibold uppercase tracking-wider text-ink-muted">
            Exemples de requêtes réelles :
          </span>

          <div className="flex flex-wrap gap-1.5">
            {presets.map((preset) => {
              const isActive = preset.id === selectedId;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedId(preset.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-micro font-medium transition-all duration-200",
                    isActive
                      ? "scale-[1.02] bg-navy text-white shadow-md shadow-navy/20"
                      : "bg-surface-alt text-ink-muted hover:bg-border/60 hover:text-ink",
                    preset.isRefusal &&
                      !isActive &&
                      "text-scarlet hover:bg-scarlet/10",
                  )}
                >
                  {preset.isRefusal ? (
                    <ShieldAlert className="size-3 text-scarlet" />
                  ) : (
                    <span className="size-1.5 rounded-full bg-current" />
                  )}
                  <span>{preset.pill}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected question */}
        <div className="relative z-10 mt-5 flex items-center gap-3 rounded-2xl border border-navy/20 bg-surface-alt/70 px-4 py-3 shadow-inner sm:px-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-navy text-white shadow-sm">
            <Search className="size-4" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-display text-small font-bold text-navy sm:truncate sm:text-body">
              « {current.question} »
            </p>
            <div className="flex items-center gap-2 text-[11px] text-ink-muted">
              <span>Domaine : {current.category}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-emerald">
                <FileCheck2 className="size-3" /> Source citée
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-lg border border-border bg-surface px-2.5 py-1 font-mono text-[11px] font-semibold text-ink-muted shadow-sm">
              ⌘K
            </span>
            <span className="rounded-lg bg-navy px-3 py-1 text-[11px] font-semibold text-white">
              Interroger
            </span>
          </div>
        </div>

        {/* Answer + source document */}
        <div className="relative z-10 mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          <SourcedAnswer current={current} />
          <SourceDocument current={current} />
        </div>

        {/* Footnote */}
        <div className="relative z-10 mt-6 flex flex-col items-center justify-between gap-3 border-t border-border/80 pt-4 text-micro text-ink-muted sm:flex-row">
          <p className="flex items-center gap-1.5">
            <Check className="size-3.5 text-emerald" />
            <span>{hero.note}</span>
          </p>
          <a
            href="#corpus"
            className="font-semibold text-navy hover:underline"
          >
            {hero.secondaryCta}
          </a>
        </div>
      </div>
    </motion.div>
  );
}

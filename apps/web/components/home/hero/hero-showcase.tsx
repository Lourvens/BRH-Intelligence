"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  BookOpen,
  Check,
  FileText,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { CorpusCount } from "@/components/corpus/stats-provider";

import { ArchiveStrip } from "./archive-strip";
import { demo } from "./data";
import { WorkspaceAnswer } from "./workspace-answer";
import { WorkspaceDocument } from "./workspace-document";

export function HeroShowcase() {
  const [runKey, setRunKey] = useState(0);

  return (
    <div id="demo" className="relative mx-auto mt-10 w-full max-w-6xl scroll-mt-24 lg:mt-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 -translate-y-4 rounded-3xl bg-gradient-to-tr from-azure/10 via-navy-ink/10 to-gold/10 blur-2xl"
      />

      <div className="absolute -top-4 right-8 z-30 hidden items-center gap-2 rounded-full border border-emerald/20 bg-surface px-4 py-2 text-caption font-semibold text-emerald shadow-md sm:inline-flex [animation-duration:3s] animate-bounce">
        <BadgeCheck className="size-4" aria-hidden />
        Source citée · p. {demo.page}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-alt/60 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-3 rounded-full bg-scarlet" />
            <span className="size-3 rounded-full bg-gold" />
            <span className="size-3 rounded-full bg-emerald" />
            <span className="ml-2 truncate font-mono text-[11px] font-medium text-ink-muted">
              brh.ht / recherche documentaire
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-[11px] font-medium text-ink-muted">
            <span className="hidden items-center gap-1 rounded border border-border bg-surface px-2 py-0.5 md:inline-flex">
              <span className="size-1.5 rounded-full bg-emerald" />
              <CorpusCount metric="discovered_urls" /> URL PDF recensées
            </span>
            <span className="font-mono text-ink-muted/70">DÉMONSTRATION</span>
          </div>
        </div>

        <div className="bg-surface p-4 sm:p-6 lg:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-navy via-navy-deep to-teal p-3 px-4 text-white shadow-md dark:to-teal/40">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-white">
                <span className="size-2 animate-pulse rounded-full bg-emerald" />
                APERÇU DE L’AGENT
              </span>
              <span className="hidden items-center gap-1.5 text-caption text-white/70 md:inline-flex">
                <Sparkles className="size-3.5 text-gold" aria-hidden />
                Recherche documentaire · v0.1
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-black/20 px-2 py-0.5">
                <FileText className="size-3 text-azure" aria-hidden />
                <CorpusCount metric="readable_documents" /> documents lisibles
              </span>
              <span className="hidden items-center gap-1 rounded border border-white/10 bg-black/20 px-2 py-0.5 sm:inline-flex">
                <BookOpen className="size-3 text-azure" aria-hidden />
                <CorpusCount metric="readable_pages" /> pages lisibles
              </span>
              <span className="rounded border border-emerald/30 bg-emerald/20 px-2 py-0.5 font-semibold text-white">
                Source citée
              </span>
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-border bg-bg p-3.5 shadow-sm sm:p-4">
            <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy text-white shadow-sm">
                  <Search className="size-5 text-gold" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal">
                      Requête documentaire
                    </span>
                    <span className="rounded bg-surface-alt px-1.5 py-0.5 text-[9px] font-bold text-navy-ink">
                      DÉMONSTRATION
                    </span>
                  </div>
                  <p className="line-clamp-2 text-small font-semibold leading-snug text-navy-ink sm:truncate sm:text-[15px]">
                    « {demo.question} »
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRunKey((value) => value + 1)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-caption font-medium text-ink transition-colors hover:bg-surface-alt"
                >
                  <RotateCcw className="size-3.5 text-teal" aria-hidden />
                  Rejouer
                </button>
                <a
                  href={demo.documentHref}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-4 py-2 text-caption font-medium text-white shadow-sm transition-colors hover:bg-navy-deep"
                >
                  <FileText className="size-3.5 text-gold" aria-hidden />
                  Voir la source
                </a>
              </div>
            </div>

            <motion.div
              key={runKey}
              initial={{ opacity: 0.45, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="mt-4 grid grid-cols-1 gap-2.5 border-t border-border pt-3.5 md:grid-cols-3">
                <div className="flex items-start gap-2 rounded-lg border border-border bg-surface p-2 text-[11.5px]">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface-alt text-[10px] font-bold text-teal">
                    1
                  </span>
                  <div>
                    <span className="block font-bold text-navy-ink">
                      Compréhension de l’intention
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      Inflation annuelle · note de novembre 2025.
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-border bg-surface p-2 text-[11.5px]">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface-alt text-[10px] font-bold text-teal">
                    2
                  </span>
                  <div>
                    <span className="block font-bold text-navy-ink">
                      Rapprochement documentaire
                    </span>
                    <span className="text-[11px] text-ink-muted">
                      Passages retrouvés · note mensuelle.
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-emerald/20 bg-emerald/5 p-2 text-[11.5px]">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald/15 text-emerald">
                    <Check className="size-3" aria-hidden />
                  </span>
                  <div>
                    <span className="block font-bold text-emerald">
                      Extraction &amp; ancrage
                    </span>
                    <span className="text-[11px] text-emerald">
                      Page {demo.page} · extrait sourcé.
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
                <WorkspaceAnswer />
                <WorkspaceDocument />
              </div>
            </motion.div>
          </div>
        </div>

        <ArchiveStrip />
      </div>
    </div>
  );
}

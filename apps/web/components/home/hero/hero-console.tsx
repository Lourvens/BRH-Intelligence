"use client";

import { motion } from "framer-motion";
import {
  Check,
  ExternalLink,
  FileText,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
} from "lucide-react";

import { cn } from "@/lib/utils";

import { heroStats, type HeroPreset } from "./data";

export function HeroConsole({
  preset,
  runKey,
  onReplay,
}: {
  preset: HeroPreset;
  runKey: number;
  onReplay: () => void;
}) {
  const stats = [
    ...heroStats,
    { label: "Source", value: `p. ${preset.page}`, unit: "" },
  ];

  const steps = [
    {
      icon: Search,
      title: "Recherche dans le corpus",
      detail: "Passages retrouvés · recherche sémantique",
      tag: "Corpus",
    },
    {
      icon: Check,
      title: `Lecture de la page ${preset.page}`,
      detail: `${preset.documentTitle} · passage retenu`,
      tag: `p. ${preset.page}`,
    },
    {
      icon: Sparkles,
      title: "Réponse rédigée",
      detail: "Chaque affirmation renvoie à sa page",
      tag: "Source citée",
    },
  ];

  return (
    <div
      id="demo"
      className="relative scroll-mt-24 overflow-hidden rounded-3xl border border-navy/50 bg-navy-deep p-5 shadow-2xl sm:p-7 lg:h-full"
    >
      <div aria-hidden className="dot-grid-light pointer-events-none absolute inset-0 opacity-20" />
      <div aria-hidden className="absolute -right-24 -top-24 size-96 rounded-full bg-azure/10 blur-3xl" />
      <div aria-hidden className="absolute -bottom-20 -left-20 size-80 rounded-full bg-navy/60 blur-3xl" />

      <div className="pointer-events-none absolute left-3 top-24 hidden origin-left -rotate-90 items-center gap-2 font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-azure sm:flex">
        <span className="size-1.5 rounded-full bg-emerald" />
        Aperçu de l’agent
      </div>

      <motion.div
        key={runKey}
        initial={{ opacity: 0.45, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 space-y-4 sm:ml-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-azure/30 bg-azure/10 px-3 py-1 font-mono text-[11px] text-white">
              <span className="size-2 rounded-full bg-emerald animate-pulse" />
              <span className="font-semibold tracking-wide text-azure">
                APERÇU DE L’AGENT
              </span>
              <span className="text-white/40">·</span>
              <span className="text-white/70">v0.1</span>
            </span>
            <span className="hidden rounded border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/60 sm:inline">
              DÉMONSTRATION
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded border border-emerald/30 bg-emerald/10 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-emerald">
              SOURCES CITÉES
            </span>
            <button
              type="button"
              onClick={onReplay}
              className="inline-flex items-center gap-1 text-caption font-medium text-azure transition-colors hover:text-white"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Rejouer
            </button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-ink/90 p-3.5">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-azure">
              <Terminal className="size-3.5" aria-hidden />
              Requête macroéconomique
            </span>
            <span className="rounded border border-emerald/20 bg-emerald/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald">
              REÇUE
            </span>
          </div>
          <p className="font-mono text-small font-semibold leading-snug text-white sm:text-body">
            « {preset.question} »
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-md"
            >
              <div className="mb-0.5 font-mono text-[9px] uppercase tracking-wider text-white/50">
                {stat.label}
              </div>
              <div className="flex items-baseline gap-1 font-mono text-small font-bold text-white tabular-nums">
                <span>{stat.value}</span>
                {stat.unit ? (
                  <span className="text-[10px] font-normal text-azure">
                    {stat.unit}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="relative space-y-2 before:absolute before:bottom-2 before:left-3.5 before:top-2 before:w-0.5 before:bg-azure/30">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;

            return (
              <div
                key={step.title}
                className={cn(
                  "relative rounded-xl border p-2.5 pl-8 text-caption transition-colors",
                  isLast
                    ? "border-azure/40 bg-navy/90 shadow-md"
                    : "border-white/10 bg-ink/80 hover:border-azure/40",
                )}
              >
                <span
                  className={cn(
                    "absolute left-2 top-3 grid size-3 place-items-center rounded-full",
                    isLast ? "bg-gold text-navy" : "bg-azure text-white",
                  )}
                >
                  <Icon className="size-2.5" aria-hidden />
                </span>
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "font-mono text-[11px] font-semibold",
                      index === 1 ? "text-azure" : "text-white",
                    )}
                  >
                    {step.title}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px]",
                      index === 1
                        ? "border-gold/30 bg-gold/15 text-gold"
                        : "border-emerald/20 bg-emerald/10 text-emerald",
                    )}
                  >
                    {step.tag}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[11px] text-white/60">
                  {step.detail}
                </p>
              </div>
            );
          })}
        </div>

        <div className="relative rounded-xl border border-azure/40 bg-ink p-4 shadow-inner">
          <div className="mb-2 flex items-center justify-between font-mono text-[10px]">
            <span className="flex items-center gap-1.5 text-emerald">
              <span className="size-1.5 rounded-full bg-emerald" />
              RÉPONSE SOURCÉE
            </span>
            <span className="text-white/40">BRH · DÉMO</span>
          </div>
          <p className="text-caption leading-relaxed text-white/80 sm:text-small">
            {preset.answerLead}{" "}
            <strong className="rounded border border-gold/40 bg-gold px-1.5 py-0.5 font-mono text-small font-bold text-navy">
              {preset.answerHighlight}
            </strong>
            {preset.answerTail}{" "}
            <sup className="ml-1 rounded border border-azure/30 bg-azure/20 px-1 font-mono text-[10px] font-bold text-white">
              [1]
            </sup>
          </p>
        </div>

        <a
          href="#corpus"
          className="group flex items-center justify-between rounded-xl border border-azure/30 bg-navy/80 p-3 text-caption text-white transition-colors hover:border-azure hover:bg-navy"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-azure/20 text-azure">
              <FileText className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-mono text-[11px] font-semibold group-hover:underline">
                {preset.documentTitle} · p. {preset.page}
              </span>
              <span className="block font-mono text-[10px] text-white/50">
                {preset.documentMeta}
              </span>
            </span>
          </span>
          <ExternalLink className="size-4 shrink-0 text-azure transition-transform group-hover:translate-x-0.5" aria-hidden />
        </a>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-1 font-mono text-[10px] text-white/50">
          <span className="flex items-center gap-1.5 text-emerald">
            <ShieldCheck className="size-3.5" aria-hidden />
            SOURCE OFFICIELLE · BRH.HT
          </span>
          <span>DOCUMENT PUBLIÉ SUR BRH.HT</span>
        </div>
      </motion.div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useState } from "react";

import { HeroConsole } from "./hero/hero-console";
import { HeroSearch } from "./hero/hero-search";
import { HeroTrust } from "./hero/hero-trust";
import { HeroVisual } from "./hero/hero-visual";
import { heroCopy, heroPresets, type HeroPreset } from "./hero/data";

export function Hero() {
  const [activeId, setActiveId] = useState("inflation");
  const [activeFilter, setActiveFilter] = useState("all");
  const [runKey, setRunKey] = useState(0);

  const preset =
    heroPresets.find((item) => item.id === activeId) ?? heroPresets[0];

  function handleFilter(id: string) {
    setActiveFilter(id);
    if (id === "all") return;

    const next = heroPresets.find((item) => item.filter === id);
    if (next) setActiveId(next.id);
  }

  function handleExample(id: string) {
    const next: HeroPreset | undefined = heroPresets.find(
      (item) => item.id === id,
    );
    if (!next) return;

    setActiveId(next.id);
    setActiveFilter(next.filter);
  }

  return (
    <section
      id="apercu"
      aria-labelledby="hero-title"
      className="relative scroll-mt-20 overflow-hidden border-b border-border bg-gradient-to-b from-bg via-surface-alt/60 to-bg pb-20 pt-10"
    >
      <div
        aria-hidden
        className="dot-grid pointer-events-none absolute inset-0 opacity-40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-br from-azure/15 via-navy/10 to-gold/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/3 size-80 rounded-full bg-azure/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-1/4 size-96 rounded-full bg-navy/10 blur-3xl"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-6">
        <div className="mx-auto mb-10 flex max-w-3xl flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-azure/30 bg-surface px-4 py-1.5 text-center shadow-sm"
          >
            <Sparkles className="size-3.5 shrink-0 text-azure" aria-hidden />
            <span className="eyebrow text-[10px] leading-snug text-navy sm:text-caption">
              {heroCopy.eyebrow}
            </span>
          </motion.div>

          <motion.h1
            id="hero-title"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="mb-5 font-display text-[2.15rem] font-bold leading-[1.08] tracking-tight text-navy [text-wrap:wrap] sm:text-5xl lg:text-[54px]"
          >
            {heroCopy.titleLead}
            <br />
            <span className="text-teal underline decoration-gold decoration-4 underline-offset-8">
              {heroCopy.titleAccent}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg"
          >
            {heroCopy.intro}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24 }}
        >
          <HeroSearch
            preset={preset}
            activeFilter={activeFilter}
            onFilter={handleFilter}
            onExample={handleExample}
          />
        </motion.div>

        <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="h-full lg:col-span-5"
          >
            <HeroVisual />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.36 }}
            className="h-full lg:col-span-7"
          >
            <HeroConsole
              preset={preset}
              runKey={runKey}
              onReplay={() => setRunKey((value) => value + 1)}
            />
          </motion.div>
        </div>

        <HeroTrust />
      </div>
    </section>
  );
}

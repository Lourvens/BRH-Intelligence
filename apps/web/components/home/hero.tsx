"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { BackgroundBeams } from "@/components/ui/background-beams";
import { ButtonLink } from "@/components/ui/button";
import { Spotlight } from "@/components/ui/spotlight";
import { hero } from "@/lib/content/home";

import { AgentConsole } from "./hero/agent-console";
import { HeroTrust } from "./hero/hero-trust";

export function Hero() {
  const [accentLead, accentTail] = hero.titleAccent.split("la page");

  return (
    <section
      aria-labelledby="titre-accueil"
      className="relative overflow-hidden pb-16 pt-8 sm:pb-24 sm:pt-14 lg:pb-28 lg:pt-16"
    >
      <Spotlight fill="var(--color-azure)" />
      <BackgroundBeams />

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-surface/90 px-4 py-1.5 text-caption font-semibold text-navy shadow-sm backdrop-blur-md"
          >
            <span className="size-2 rounded-full bg-gold-ink" />
            <span>{hero.eyebrow}</span>
            <span className="hidden h-3.5 w-px bg-border sm:inline" />
            <span className="hidden text-ink-muted sm:inline">
              1 169 PDF recensés
            </span>
          </motion.div>

          <motion.h1
            id="titre-accueil"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 max-w-4xl font-display text-[2.25rem] font-bold leading-[1.06] tracking-[-0.04em] text-navy sm:text-[3.5rem] lg:text-[4rem]"
          >
            {hero.titleLead}
            <span className="mt-2 block">
              {accentLead}
              <span className="whitespace-nowrap underline decoration-gold decoration-[0.1em] underline-offset-[0.16em]">
                la page
              </span>
              {accentTail}
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-2xl text-body leading-relaxed text-ink-muted sm:text-lead"
          >
            {hero.intro}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <ButtonLink href="#apercu" size="lg" className="w-full sm:w-auto">
              {hero.primaryCta}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink
              href="#corpus"
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto"
            >
              {hero.secondaryCta}
            </ButtonLink>
          </motion.div>
        </div>

        <AgentConsole />
        <HeroTrust />
      </div>
    </section>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";

import { easeOut } from "@/components/motion/tokens";
import { cn } from "@/lib/utils";

/**
 * A page stack with one report pulled forward. No shadows on data, no
 * recoloured logo: this is an abstract document, not a BRH cover.
 */
export function DocumentStack({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <div
      className={cn(
        "relative h-[250px] w-full max-w-[320px] select-none",
        className,
      )}
      aria-hidden="true"
    >
      <motion.div
        className="relative h-full w-full"
        initial={reduce ? false : { opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6, ease: easeOut }}
        whileHover={reduce ? undefined : { y: -6, rotate: -1 }}
      >
        <div className="absolute left-8 top-10 h-[200px] w-[218px] rotate-[7deg] rounded-xl border border-border bg-surface-alt" />
        <div className="absolute left-4 top-5 h-[205px] w-[222px] -rotate-[4deg] rounded-xl border border-border bg-surface" />

        <div className="absolute left-0 top-0 h-[218px] w-[230px] rounded-xl border border-border bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
              Note mensuelle
            </span>
            <span className="text-[10px] text-ink-muted">p.&nbsp;3</span>
          </div>

          <div className="mt-4 h-1.5 w-16 rounded-full bg-gold" />

          <p className="mt-4 font-display text-small font-semibold leading-tight text-navy">
            Inflation
            <br />
            novembre 2025
          </p>

          <div className="mt-5 space-y-2">
            <div className="h-1 w-full rounded-full bg-border" />
            <div className="h-1 w-5/6 rounded-full bg-border" />
            <div className="h-1 w-2/3 rounded-full bg-border" />
          </div>

          <div className="mt-4 rounded-lg bg-surface-alt p-3">
            <div className="h-1 w-1/2 rounded-full bg-ink/15" />
            <div className="mt-2 h-1 w-3/4 rounded-full bg-ink/10" />
          </div>

          <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between text-[10px] text-ink-muted">
            <span>IHSI / BRH</span>
            <span className="rounded-full bg-navy px-2 py-0.5 font-medium text-white">
              28,3&nbsp;%
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

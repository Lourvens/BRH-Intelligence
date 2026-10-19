"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { Check, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  PageSourceIcon,
  QuoteMarkIcon,
  SearchBeamIcon,
} from "@/components/illustrations/icons";
import { easeOut } from "@/components/motion/tokens";
import { CitationChip } from "@/components/ui/citation-chip";
import { demo } from "@/lib/content/home";
import { cn } from "@/lib/utils";

const stepIcons = [SearchBeamIcon, PageSourceIcon, QuoteMarkIcon];

/**
 * The hero's product proof: a question, three visible agent steps, and the
 * real answer with its page. The sequence plays once in view and can be
 * replayed; reduced motion renders the completed trace immediately.
 */
export function AgentDemo() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduce = useReducedMotion();
  const [run, setRun] = useState(0);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView) return;

    if (reduce) {
      setStep(demo.steps.length);
      return;
    }

    setStep(0);
    const timers = demo.steps.map((_, index) =>
      window.setTimeout(() => setStep(index + 1), 520 + index * 640),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [inView, reduce, run]);

  const done = step >= demo.steps.length;

  return (
    <motion.figure
      ref={ref}
      id="apercu"
      className="relative scroll-mt-24"
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: easeOut }}
    >
      <div
        aria-hidden
        className="absolute -inset-x-4 -inset-y-5 -z-10 rounded-[2rem] bg-surface-alt/80 sm:-inset-x-6 sm:-inset-y-6"
      />

      <div className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 text-caption font-medium text-ink-muted">
            <span className="size-1.5 rounded-full bg-gold-ink" aria-hidden />
            {demo.badge}
          </span>

          {!reduce && (
            <button
              type="button"
              onClick={() => setRun((count) => count + 1)}
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-micro font-medium text-ink-muted transition-colors hover:bg-surface-alt hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
            >
              <RotateCcw className="size-3" aria-hidden />
              Rejouer
            </button>
          )}
        </div>

        <div className="mt-5 rounded-xl bg-bg p-4">
          <p className="text-micro font-semibold uppercase tracking-[0.08em] text-ink-muted">
            Question
          </p>
          <p className="mt-1.5 font-display text-lead font-semibold leading-snug tracking-[-0.01em] text-navy">
            {demo.question}
          </p>
        </div>

        <ol className="relative mt-5 space-y-1" aria-label="Étapes de l'agent">
          <span
            aria-hidden
            className="absolute bottom-3 left-[13px] top-3 w-px bg-border"
          />
          {demo.steps.map((item, index) => {
            const Icon = stepIcons[index] ?? SearchBeamIcon;
            const state =
              step > index ? "done" : step === index ? "active" : "pending";

            return (
              <motion.li
                key={item.label}
                className="relative flex items-start gap-3 py-1.5"
                animate={{ opacity: state === "pending" ? 0.45 : 1 }}
                transition={{ duration: 0.3 }}
              >
                <span
                  className={cn(
                    "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border transition-colors",
                    state === "done" && "border-navy bg-navy text-white",
                    state === "active" &&
                      "border-azure bg-surface text-azure",
                    state === "pending" &&
                      "border-border bg-surface text-ink-muted",
                  )}
                >
                  {state === "done" ? (
                    <Check className="size-3.5" aria-hidden />
                  ) : (
                    <Icon className="size-3.5" aria-hidden />
                  )}
                  {state === "active" && (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full ring-2 ring-azure/30"
                      animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  )}
                </span>

                <span className="min-w-0 pt-0.5">
                  <span
                    className={cn(
                      "block text-small font-medium",
                      state === "pending" ? "text-ink-muted" : "text-ink",
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="block text-micro text-ink-muted">
                    {item.detail}
                  </span>
                </span>

                <span className="ml-auto shrink-0 pt-1 text-micro tabular-nums text-ink-muted">
                  {item.time}
                </span>
              </motion.li>
            );
          })}
        </ol>

        <motion.div
          aria-live="polite"
          className="mt-5 rounded-xl border border-border bg-surface p-4"
          animate={{ opacity: done ? 1 : 0.35, y: done ? 0 : 4 }}
          transition={{ duration: 0.35, ease: easeOut }}
        >
          <p className="flex items-center gap-2 text-micro font-medium text-ink-muted">
            <QuoteMarkIcon className="size-4 text-gold-ink" />
            Réponse
          </p>
          <p className="mt-2 text-small leading-relaxed text-ink">
            {demo.answerLead}{" "}
            <strong className="font-display text-lead font-bold text-navy">
              {demo.answerFigure}
            </strong>
            {demo.answerTail}
            <span className="ml-1 align-super text-[0.7em] font-semibold text-navy">
              [1]
            </span>
          </p>
          <CitationChip
            className="mt-4"
            index={1}
            title={demo.source}
            page={demo.page}
          />
        </motion.div>

        <p className="mt-4 border-t border-border pt-3 text-micro text-ink-muted">
          {demo.footer}
        </p>
      </div>
    </motion.figure>
  );
}

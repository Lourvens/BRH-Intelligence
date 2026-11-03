"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FileSearch } from "lucide-react";

export function SourcesEmpty() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.01 } }
          : { opacity: 0, y: -3, transition: { duration: 0.1 } }
      }
      transition={{ duration: reduceMotion ? 0.01 : 0.16 }}
      className="flex w-full flex-1 flex-col items-center justify-center px-6 text-center"
    >
      <div className="mb-3 grid size-12 place-items-center rounded-sm bg-surface-alt text-teal">
        <FileSearch className="size-6" aria-hidden />
      </div>
      <p className="font-display text-small font-bold text-navy-ink">
        Les sources apparaîtront ici
      </p>
      <p className="mt-1.5 max-w-[220px] text-small leading-relaxed text-ink-muted">
        Chaque réponse renvoie à un document et à une page du corpus.
      </p>
    </motion.div>
  );
}

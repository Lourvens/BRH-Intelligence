"use client";

import { motion } from "framer-motion";

import {
  BookStackIcon,
  ClockIcon,
  OcrScanIcon,
} from "@/components/illustrations/icons";
import { Counter } from "@/components/ui/counter";

const stats = [
  {
    icon: BookStackIcon,
    value: 1169,
    suffix: "",
    label: "PDF recensés",
    sublabel: "Inventaire officiel brh.ht",
  },
  {
    icon: OcrScanIcon,
    value: 1192,
    suffix: "",
    label: "Pages profilées",
    sublabel: "Échantillon OCR & transcription",
  },
  {
    icon: OcrScanIcon,
    value: 34,
    suffix: "",
    label: "Documents transcrits",
    sublabel: "Batch OCR en cours",
  },
  {
    icon: ClockIcon,
    customValue: "2018—2026",
    label: "Période couverte",
    sublabel: "8 ans d'archives économiques",
  },
];

export function MetricsBanner() {
  return (
    <section className="border-y border-border/80 bg-surface/70 py-12 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;

            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: idx * 0.08 }}
                className="group flex flex-col items-start"
              >
                <div className="flex items-center gap-2">
                  <span className="grid size-8 place-items-center rounded-lg bg-surface-alt text-navy transition-colors group-hover:bg-azure/10 group-hover:text-azure">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    {stat.label}
                  </span>
                </div>

                <div className="mt-3 font-display text-[2rem] font-extrabold tracking-tight text-navy sm:text-[2.25rem]">
                  {stat.value ? (
                    <Counter value={stat.value} suffix={stat.suffix} />
                  ) : (
                    <span>{stat.customValue}</span>
                  )}
                </div>

                <p className="mt-1 text-micro text-ink-muted">{stat.sublabel}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

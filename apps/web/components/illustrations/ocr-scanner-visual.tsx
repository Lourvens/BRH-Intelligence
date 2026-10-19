"use client";

import { motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, FileText, ScanLine, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

interface OcrScannerVisualProps {
  className?: string;
}

/**
 * Visual illustration of targeted OCR and bounding-box page coordinate detection.
 * Demonstrates how scanned BRH documents are partitioned and transcribed page by page.
 */
export function OcrScannerVisual({ className }: OcrScannerVisualProps) {
  const reduce = useReducedMotion();

  return (
    <div
      className={cn(
        "relative mx-auto flex h-[310px] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-border/80 bg-surface p-4 shadow-lift select-none sm:p-5",
        className,
      )}
      aria-hidden="true"
    >
      {/* Top Header of Document Card */}
      <div className="flex items-center justify-between border-b border-border/70 pb-3">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-navy/5 text-navy">
            <FileText className="size-4" />
          </span>
          <div>
            <p className="font-display text-micro font-bold tracking-tight text-navy">
              CIRCULAIRE.PDF
            </p>
            <p className="text-[10px] text-ink-muted">Page 4 · Couche texte absente</p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-azure/10 px-2 py-0.5 text-[10px] font-semibold text-azure">
          <ScanLine className="size-3 animate-pulse" />
          OCR Actif
        </span>
      </div>

      {/* Simulated Document Body with Detected Bounding Boxes */}
      <div className="relative mt-3 flex-1 rounded-xl bg-surface-alt/70 p-3.5">
        {/* Animated Laser Scanning Beam */}
        <motion.div
          className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-azure to-transparent shadow-[0_0_12px_rgba(0,156,220,0.8)]"
          animate={reduce ? undefined : { top: ["8%", "88%", "8%"] }}
          transition={
            reduce
              ? undefined
              : { duration: 3.5, repeat: Infinity, ease: "easeInOut" }
          }
        />

        {/* Text lines simulating official central bank decree */}
        <div className="space-y-2">
          <div className="h-2 w-3/5 rounded bg-ink/15" />
          <div className="h-2 w-4/5 rounded bg-ink/10" />
        </div>

        {/* Highlighted OCR Bounding Box 1 (Grounded Quote) */}
        <motion.div
          className="relative mt-3 rounded-lg border border-azure/60 bg-azure/[0.08] p-2"
        >
          <div className="flex items-center justify-between text-[9px] font-semibold text-azure">
            <span>Zone OCR · page 4</span>
            <span className="inline-flex items-center gap-0.5 text-emerald font-bold">
              <CheckCircle2 className="size-2.5" /> Extrait
            </span>
          </div>
          <p className="mt-1 font-mono text-[10.5px] leading-tight text-navy font-medium">
            « La présente circulaire établit les mesures préventives que les
            institutions financières doivent prendre... »
          </p>
        </motion.div>

        {/* Highlighted OCR Bounding Box 2 */}
        <div className="mt-2.5 space-y-1.5">
          <div className="h-2 w-full rounded bg-ink/10" />
          <div className="h-2 w-5/6 rounded bg-ink/10" />
        </div>

        <div className="mt-3 flex items-center justify-between rounded-md border border-border bg-surface px-2.5 py-1.5 text-[10px]">
          <span className="text-ink-muted">Coordonnées PDF conservées</span>
          <span className="font-semibold text-navy">Page 4 · zone détectée</span>
        </div>
      </div>

      {/* Footer Status */}
      <div className="mt-3 flex items-center justify-between pt-1 text-[11px] text-ink-muted">
        <span className="inline-flex items-center gap-1">
          <Sparkles className="size-3 text-gold-ink" />
          Transcription PaddleOCR-VL
        </span>
        <span className="font-semibold text-navy">Source citée</span>
      </div>
    </div>
  );
}

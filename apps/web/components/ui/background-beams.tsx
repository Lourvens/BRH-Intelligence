"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface BackgroundBeamsProps {
  className?: string;
}

/**
 * Aceternity-inspired BackgroundBeams component.
 * Renders technical perspective lines, subtle dot mesh, and glowing radiant waves.
 */
export function BackgroundBeams({ className }: BackgroundBeamsProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-0 overflow-hidden select-none",
        className,
      )}
      aria-hidden="true"
    >
      {/* Radial Masked Technical Grid */}
      <div
        className="absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(3, 26, 113, 0.18) 1.5px, transparent 0)`,
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 20%, black 15%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 20%, black 15%, transparent 75%)",
        }}
      />

      {/* Radiant Glowing Orbs */}
      <motion.div
        className="absolute -top-32 left-1/2 -z-10 h-[520px] w-[680px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-azure/20 via-navy/15 to-gold/10 blur-[90px]"
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.55, 0.75, 0.55],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Decorative Technical Vector Orbits */}
      <svg
        className="absolute left-1/2 top-0 h-[640px] w-[1200px] -translate-x-1/2 stroke-navy/[0.08]"
        viewBox="0 0 1200 640"
        fill="none"
      >
        <ellipse cx="600" cy="180" rx="480" ry="220" strokeWidth="1" />
        <ellipse cx="600" cy="180" rx="340" ry="150" strokeWidth="1" strokeDasharray="3 6" />
        <ellipse cx="600" cy="180" rx="200" ry="85" strokeWidth="1" />
        <circle cx="260" cy="180" r="4" fill="var(--color-azure)" opacity="0.6" />
        <circle cx="940" cy="180" r="4" fill="var(--color-navy)" opacity="0.5" />
      </svg>

      {/* Top Hairline */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

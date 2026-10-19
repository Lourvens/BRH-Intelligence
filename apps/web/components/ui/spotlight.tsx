"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface SpotlightProps {
  className?: string;
  fill?: string;
}

/**
 * Aceternity-inspired Spotlight component.
 * Renders an ambient, sweeping cone of light to elevate the hero and focus attention.
 */
export function Spotlight({ className, fill = "var(--color-azure)" }: SpotlightProps) {
  return (
    <motion.svg
      className={cn(
        "pointer-events-none absolute -top-40 left-0 z-0 h-[160%] w-[140%] -translate-x-1/4 opacity-40 mix-blend-screen sm:-top-20 sm:w-[120%]",
        className,
      )}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 3787 2842"
      fill="none"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 0.45, scale: 1 }}
      transition={{ duration: 1.4, ease: "easeOut" }}
      aria-hidden="true"
    >
      <g filter="url(#spotlight-filter)">
        <ellipse
          cx="1924.71"
          cy="273.501"
          rx="1924.71"
          ry="273.501"
          transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
          fill={fill}
          fillOpacity="0.32"
        />
        <ellipse
          cx="1400"
          cy="380"
          rx="800"
          ry="180"
          transform="matrix(-0.75 -0.66 -0.66 0.75 2800 1800)"
          fill="var(--color-navy)"
          fillOpacity="0.25"
        />
        <ellipse
          cx="1200"
          cy="600"
          rx="500"
          ry="120"
          transform="matrix(-0.6 -0.8 -0.8 0.6 2200 1400)"
          fill="var(--color-gold)"
          fillOpacity="0.18"
        />
      </g>
      <defs>
        <filter
          id="spotlight-filter"
          x="0.860352"
          y="0.838989"
          width="3785.16"
          height="2840.26"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
          <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur" />
        </filter>
      </defs>
    </motion.svg>
  );
}

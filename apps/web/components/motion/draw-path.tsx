"use client";

import { motion, useReducedMotion } from "framer-motion";

type DrawPathProps = {
  d: string;
  delay?: number;
  duration?: number;
  strokeWidth?: number;
  className?: string;
  markerEnd?: string;
};

/** Draws an SVG path with `pathLength` — transform-free and cheap. */
export function DrawPath({
  d,
  delay = 0,
  duration = 0.9,
  strokeWidth = 1.5,
  className,
  markerEnd,
}: DrawPathProps) {
  const reduce = useReducedMotion();

  return (
    <motion.path
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
      className={className}
      markerEnd={markerEnd}
      initial={{ pathLength: 0, opacity: 0 }}
      animate={reduce ? { pathLength: 1, opacity: 1 } : undefined}
      whileInView={reduce ? undefined : { pathLength: 1, opacity: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{
        pathLength: { duration, delay, ease: "easeInOut" },
        opacity: { duration: 0.2, delay },
      }}
    />
  );
}

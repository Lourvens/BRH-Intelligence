"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

import { easeOut } from "./tokens";

/**
 * One motion context for the page. `reducedMotion="user"` is the OS setting,
 * not a preference of ours: it disables positional transforms automatically.
 * SVG draws and sequences still need their own `useReducedMotion` gate.
 */
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.55, ease: easeOut }}
    >
      {children}
    </MotionConfig>
  );
}

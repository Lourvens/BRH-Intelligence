import type { Transition } from "framer-motion";

/** Shared easing for every page transition. */
export const easeOut: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const springSoft: Transition = {
  type: "spring",
  visualDuration: 0.5,
  bounce: 0.12,
};

export const springSnappy: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 28,
};

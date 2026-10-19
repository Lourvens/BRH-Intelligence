"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

import { easeOut } from "./tokens";

type RevealProps = ComponentProps<"div"> & {
  delay?: number;
  y?: number;
  once?: boolean;
  amount?: number;
};

/**
 * A single scroll reveal. Keep one wrapper per group rather than one per child;
 * stagger inside the group with `<Stagger>`.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  once = true,
  amount = 0.25,
  ...rest
}: RevealProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      data-reveal
      className={cn(className)}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once, amount, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.55, delay, ease: easeOut }}
      {...(rest as ComponentProps<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}

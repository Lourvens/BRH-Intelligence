"use client";

import { motion, stagger } from "framer-motion";
import type { ReactNode } from "react";
import type { Variants } from "framer-motion";

import { cn } from "@/lib/utils";

import { easeOut } from "./tokens";

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOut },
  },
};

export function Stagger({
  children,
  className,
  step = 0.07,
  delay = 0,
  once = true,
  amount = 0.2,
}: {
  children: ReactNode;
  className?: string;
  step?: number;
  delay?: number;
  once?: boolean;
  amount?: number;
}) {
  const variants: Variants = {
    hidden: {},
    show: {
      transition: {
        delayChildren: stagger(step, { startDelay: delay }),
      },
    },
  };

  return (
    <motion.div
      data-reveal
      className={cn(className)}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      variants={variants}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      data-reveal
      className={cn(className)}
      variants={itemVariants}
    >
      {children}
    </motion.div>
  );
}

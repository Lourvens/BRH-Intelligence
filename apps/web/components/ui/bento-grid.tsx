"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

export function BentoGrid({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
  badge,
  colSpan = 1,
}: {
  className?: string;
  title?: string | ReactNode;
  description?: string | ReactNode;
  header?: ReactNode;
  icon?: ReactNode;
  badge?: string;
  colSpan?: 1 | 2 | 3;
}) {
  const colSpanClass = {
    1: "lg:col-span-1",
    2: "lg:col-span-2",
    3: "lg:col-span-3",
  }[colSpan];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "group/bento relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:border-azure/40 hover:shadow-lift",
        colSpanClass,
        className,
      )}
    >
      {/* Top Header/Illustration */}
      {header && <div className="mb-4 w-full">{header}</div>}

      {/* Content */}
      <div className="mt-auto transition-transform duration-200 group-hover/bento:translate-x-1">
        <div className="flex items-center justify-between gap-3">
          {icon && (
            <div className="grid size-9 place-items-center rounded-xl bg-surface-alt text-navy transition-colors group-hover/bento:bg-azure/10 group-hover/bento:text-azure">
              {icon}
            </div>
          )}
          {badge && (
            <span className="rounded-full bg-surface-alt px-2.5 py-0.5 text-micro font-medium text-ink-muted group-hover/bento:bg-azure/10 group-hover/bento:text-azure">
              {badge}
            </span>
          )}
        </div>

        {title && (
          <div className="mt-3 font-display text-body font-bold text-navy sm:text-lead">
            {title}
          </div>
        )}

        {description && (
          <div className="mt-1.5 text-small leading-relaxed text-ink-muted">
            {description}
          </div>
        )}
      </div>
    </motion.div>
  );
}

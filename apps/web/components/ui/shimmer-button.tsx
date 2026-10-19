"use client";

import { motion } from "framer-motion";
import { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  shimmerColor?: string;
  className?: string;
}

interface ShimmerLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode;
  shimmerColor?: string;
  className?: string;
}

/**
 * Aceternity-inspired Shimmer Button.
 * Features an animated glowing gradient border and crisp typography.
 */
export function ShimmerButton({
  children,
  className,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full p-[1.5px] font-display text-small font-semibold transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy",
        className,
      )}
      {...props}
    >
      {/* Animated Rotating Gradient Border */}
      <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,var(--color-azure)_0%,var(--color-navy)_50%,var(--color-blue)_100%)] opacity-80 group-hover:opacity-100 motion-reduce:animate-none" />

      {/* Button Interior */}
      <span className="relative inline-flex h-full w-full items-center justify-center gap-2 rounded-full bg-navy px-6 py-2.5 text-white transition-colors group-hover:bg-navy-deep">
        {children}
      </span>
    </button>
  );
}

export function ShimmerLink({
  children,
  className,
  href,
  ...props
}: ShimmerLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full p-[1.5px] font-display text-small font-semibold transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy",
        className,
      )}
      {...props}
    >
      <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,var(--color-azure)_0%,var(--color-navy)_50%,var(--color-blue)_100%)] opacity-80 group-hover:opacity-100 motion-reduce:animate-none" />
      <span className="relative inline-flex h-full w-full items-center justify-center gap-2 rounded-full bg-navy px-6 py-2.5 text-white transition-colors group-hover:bg-navy-deep">
        {children}
      </span>
    </a>
  );
}

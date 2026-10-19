import Link from "next/link";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "gold";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-navy-deep",
  secondary:
    "border border-border bg-surface text-navy hover:border-navy/25 hover:bg-surface-alt",
  ghost: "text-navy hover:bg-surface-alt",
  // Gold is a fill colour only. Navy on gold stays readable; never gold on white.
  // The white focus ring assumes the gold button sits on the navy CTA band.
  gold:
    "bg-gold text-navy hover:brightness-95 focus-visible:ring-white focus-visible:ring-offset-navy-deep",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-caption",
  md: "h-11 px-5 text-small",
  lg: "h-12 px-6 text-body",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      {...props}
    />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
};

export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props} />
  );
}

import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

type BrandProps = {
  /** Descriptor under the wordmark. Pass `null` to omit it. */
  subtitle?: string | null;
  size?: "sm" | "md";
  tone?: "default" | "inverse";
  priority?: boolean;
  className?: string;
};

/**
 * The product lockup: the official BRH monogram, a rule, and the “Intelligence”
 * wordmark. The mark is never recoloured — on dark or inverse surfaces it sits
 * on a white tile so it keeps its official navy.
 */
export function Brand({
  subtitle = "Banque de la République d’Haïti",
  size = "md",
  tone = "default",
  priority = false,
  className,
}: BrandProps) {
  const inverse = tone === "inverse";
  const compact = size === "sm";

  return (
    <Link
      href="/"
      aria-label="BRH Intelligence — accueil"
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 sm:gap-3",
        inverse ? "focus-visible:ring-white/70" : "focus-visible:ring-navy-ink",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-lg p-1",
          inverse ? "bg-white shadow-sm" : "dark:bg-white dark:shadow-sm",
        )}
      >
        <Image
          src="/brh-logo.png"
          alt="BRH"
          width={251}
          height={123}
          priority={priority}
          className={cn("w-auto", compact ? "h-5" : "h-5 sm:h-6")}
        />
      </span>
      <span
        aria-hidden
        className={cn(
          "hidden w-px shrink-0 sm:block",
          compact ? "h-5" : "h-6",
          inverse ? "bg-white/20" : "bg-border",
        )}
      />
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate font-display font-bold leading-none tracking-[-0.03em]",
            compact ? "text-small" : "text-[15px] sm:text-body",
            inverse ? "text-white" : "text-navy-ink",
          )}
        >
          Intelligence
        </span>
        {subtitle ? (
          <span
            className={cn(
              "mt-1.5 truncate text-[10px] font-medium leading-none",
              compact ? "block" : "hidden sm:block",
              inverse ? "text-white/60" : "text-ink-muted",
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The BRH lockup: the original mark (251×123, never recoloured or stretched)
 * followed by the product name. The mark is navy, so the lockup only goes on
 * light surfaces.
 */
export function Brand({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="BRH Intelligence — accueil"
      className={cn(
        "inline-flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-4",
        className,
      )}
    >
      <Image
        src="/brh-logo.png"
        alt=""
        width={251}
        height={123}
        priority={priority}
        className="h-7 w-auto"
      />
      <span aria-hidden className="h-6 w-px bg-border" />
      <span className="leading-tight">
        <span className="block font-display text-caption font-semibold tracking-[0.01em] text-navy">
          Intelligence
        </span>
        <span className="hidden text-micro font-medium text-ink-muted sm:block">
          Banque de la République d&apos;Haïti
        </span>
      </span>
    </Link>
  );
}

import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  className,
  titleId,
  tone = "light",
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  className?: string;
  titleId?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <div className={cn("max-w-2xl", className)}>
      <p
        className={cn(
          "eyebrow flex items-center gap-2",
          dark ? "text-white/60" : "text-ink-muted",
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full",
            dark ? "bg-gold" : "bg-gold-ink",
          )}
          aria-hidden
        />
        {eyebrow}
      </p>
      <h2
        id={titleId}
        className={cn(
          "mt-4 font-display text-title font-semibold tracking-[-0.02em] sm:text-headline",
          dark ? "text-white" : "text-navy",
        )}
      >
        {title}
      </h2>
      {intro ? (
        <p
          className={cn(
            "mt-4 text-body leading-relaxed",
            dark ? "text-white/65" : "text-ink-muted",
          )}
        >
          {intro}
        </p>
      ) : null}
    </div>
  );
}

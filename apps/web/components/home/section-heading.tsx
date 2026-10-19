import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  className,
  titleId,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
  className?: string;
  titleId?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <p className="eyebrow flex items-center gap-2 text-ink-muted">
        <span className="size-1.5 rounded-full bg-gold-ink" aria-hidden />
        {eyebrow}
      </p>
      <h2
        id={titleId}
        className="mt-4 font-display text-title font-semibold tracking-[-0.02em] text-navy sm:text-headline"
      >
        {title}
      </h2>
      {intro ? (
        <p className="mt-4 text-body leading-relaxed text-ink-muted">
          {intro}
        </p>
      ) : null}
    </div>
  );
}

import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  className,
  titleClassName,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <span className="eyebrow mb-2 block text-gold-ink">{eyebrow}</span>
      <h2
        className={cn(
          "mb-3 font-display text-2xl font-bold leading-tight tracking-tight text-navy sm:text-3xl lg:text-[34px]",
          titleClassName,
        )}
      >
        {title}
      </h2>
      <p className="text-small leading-relaxed text-ink-muted sm:text-body">
        {intro}
      </p>
    </div>
  );
}

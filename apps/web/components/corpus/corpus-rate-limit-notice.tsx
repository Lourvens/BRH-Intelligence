"use client";

import { Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCountdown } from "@/lib/hooks/use-countdown";
import {
  rateLimitQuota,
  rateLimitTitle,
  type CorpusRateLimit,
  type CorpusSurface,
} from "@/lib/corpus/rate-limit";
import { cn } from "@/lib/utils";

export function CorpusRateLimitNotice({
  rateLimit,
  surface,
  onRetry,
  secondaryAction,
  className,
}: {
  rateLimit: CorpusRateLimit;
  surface: CorpusSurface;
  onRetry: () => void;
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
}) {
  const remaining = useCountdown(rateLimit.retryAfterSeconds, rateLimit);
  const quota = rateLimitQuota(rateLimit);

  return (
    <div
      role="alert"
      aria-atomic="true"
      className={cn(
        "rounded-xl border border-border border-l-2 border-l-scarlet bg-surface-alt/60 p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Timer className="mt-0.5 size-4 shrink-0 text-scarlet" aria-hidden />
        <div className="min-w-0">
          <p className="font-display text-caption font-bold text-navy-ink">
            {rateLimitTitle(rateLimit, surface)}
          </p>
          <p className="mt-1 text-small leading-relaxed text-ink">{rateLimit.message}</p>
          {quota ? <p className="mt-1 text-caption text-ink-muted">{quota}</p> : null}
          <p className="mt-2 text-caption text-ink-muted">
            {remaining > 0 ? `Nouvelle tentative possible dans ${remaining} s.` : "Vous pouvez réessayer maintenant."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={remaining > 0}
              onClick={onRetry}
              className="min-h-10"
            >
              {remaining > 0 ? `Réessayer dans ${remaining} s` : "Réessayer"}
            </Button>
            {secondaryAction ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={secondaryAction.onClick}
                className="min-h-10 text-ink-muted"
              >
                {secondaryAction.label}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

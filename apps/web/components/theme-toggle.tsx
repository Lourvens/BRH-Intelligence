"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Light/dark switch.
 *
 * The icon and the optional label are swapped with the `dark:` variant rather
 * than with React state, so they are correct on the very first paint (the
 * theme class is already on <html>) and can never cause a hydration mismatch.
 * `mounted` only gates the accessible name / aria-pressed, which are not
 * rendered on the server.
 */
export function ThemeToggle({
  className,
  withLabel = false,
}: {
  className?: string;
  withLabel?: boolean;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const label = !mounted
    ? "Changer de thème"
    : isDark
      ? "Activer le thème clair"
      : "Activer le thème sombre";

  function toggleTheme() {
    const currentlyDark =
      resolvedTheme === "dark" ||
      document.documentElement.classList.contains("dark");
    setTheme(currentlyDark ? "light" : "dark");
  }

  const button = (
    <Button
      type="button"
      variant="ghost"
      size={withLabel ? "sm" : "icon-sm"}
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={mounted ? isDark : undefined}
      title={label}
      className={cn(
        "rounded-lg text-ink-muted transition-[background-color,color,transform] duration-200 hover:text-navy-ink active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100",
        withLabel
          ? "w-full justify-start gap-2 px-2 text-[11px] font-medium"
          : "size-9 border border-border bg-surface shadow-sm hover:bg-surface-alt",
        className,
      )}
    >
      <Sun className="hidden size-4 dark:block" aria-hidden />
      <Moon className="size-4 dark:hidden" aria-hidden />
      {withLabel ? (
        <span className="truncate">
          <span className="dark:hidden">Thème sombre</span>
          <span className="hidden dark:inline">Thème clair</span>
        </span>
      ) : null}
    </Button>
  );

  if (withLabel) return button;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

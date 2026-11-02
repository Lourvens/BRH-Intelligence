import { ArrowRight } from "lucide-react";

import { navigation } from "@/lib/content/navigation";

import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/95 shadow-[0_1px_3px_rgba(11,23,41,0.03)] backdrop-blur-md">
      {/* Same wrapper as the landing sections, so the logo, hero copy and
          footer share one left edge. */}
      <div className="landing-wrap flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Brand priority className="shrink-0" />

        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-5 lg:flex"
        >
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-small font-medium text-ink-muted transition-colors hover:text-navy-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-caption font-medium text-ink-muted sm:flex">
            <span className="size-2 rounded-full bg-emerald" />
            <span>Publications en français</span>
          </div>

          <ThemeToggle className="size-8 sm:size-9" />

          <a
            href="/assistant"
            className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3 py-2 text-caption font-semibold text-white shadow-sm transition-colors hover:bg-navy-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 sm:px-4"
          >
            <span className="sm:hidden">Assistant</span>
            <span className="hidden sm:inline">Ouvrir l’assistant</span>
            <ArrowRight className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>
    </header>
  );
}

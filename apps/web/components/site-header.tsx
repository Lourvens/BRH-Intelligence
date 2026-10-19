"use client";

import { ArrowRight, Sparkles } from "lucide-react";

import { Brand } from "@/components/brand";
import { MobileNav } from "@/components/mobile-nav";
import { navigation } from "@/lib/content/navigation";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-surface/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <div className="flex items-center gap-6">
          <Brand priority />

          {/* Corpus snapshot */}
          <div className="hidden lg:flex items-center gap-2 rounded-full border border-border/80 bg-surface-alt/70 px-3 py-1 text-micro text-ink-muted">
            <span className="size-2 rounded-full bg-gold-ink" />
            <span>Archive 2018—2026</span>
          </div>
        </div>

        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-8 md:flex"
        >
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="relative text-small font-medium text-ink-muted transition-colors hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#apercu"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 font-display text-micro font-semibold text-white shadow-sm transition-all hover:bg-navy-deep active:scale-95"
          >
            <Sparkles className="size-3 text-azure" />
            <span>Voir un exemple</span>
            <ArrowRight className="size-3.5" />
          </a>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { navigation } from "@/lib/content/navigation";

import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/95 shadow-[0_1px_3px_rgba(11,23,41,0.03)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-6">
        <Link
          href="/"
          aria-label="BRH Intelligence — accueil"
          className="flex shrink-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-ink"
        >
          {/* The mark is navy only; on dark surfaces it sits on a white chip so
              it keeps its official colour and stays visible. */}
          <span className="inline-flex items-center justify-center dark:rounded-sm dark:bg-white dark:p-0.5">
            <Image
              src="/brh-logo.png"
              alt="BRH"
              width={251}
              height={123}
              priority
              className="h-7 w-auto"
            />
          </span>
          <span className="hidden h-6 w-px bg-border sm:block" />
          <span className="flex flex-col">
            <span className="font-display text-body font-bold leading-none tracking-tight text-navy-ink">
              Intelligence
            </span>
            <span className="mt-1 hidden text-[10px] font-medium leading-none text-ink-muted sm:block">
              Banque de la République d’Haïti
            </span>
          </span>
        </Link>

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

        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-caption font-medium text-ink-muted sm:flex">
            <span className="size-2 rounded-full bg-emerald" />
            <span>Archive 2018—2026</span>
          </div>

          <ThemeToggle className="size-8 sm:size-9" />

          <a
            href="/assistant"
            className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-caption font-semibold text-white shadow-sm transition-colors hover:bg-navy-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2"
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

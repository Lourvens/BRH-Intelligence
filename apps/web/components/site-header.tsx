import { ArrowRight } from "lucide-react";

import { Brand } from "@/components/brand";
import { MobileNav } from "@/components/mobile-nav";
import { ButtonLink } from "@/components/ui/button";
import { navigation } from "@/lib/content/navigation";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5 sm:px-8">
        <Brand priority />

        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-7 md:flex"
        >
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-sm text-small text-ink-muted transition-colors hover:text-navy"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink
            href="#apercu"
            size="md"
            className="hidden sm:inline-flex"
          >
            Voir un exemple
            <ArrowRight className="size-3.5" aria-hidden />
          </ButtonLink>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

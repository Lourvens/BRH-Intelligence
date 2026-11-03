import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { navigation } from "@/lib/content/navigation";

import { Brand } from "./brand";
import { SiteMobileNav } from "./site-mobile-nav";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/90 shadow-[0_1px_3px_rgba(11,23,41,0.03)] backdrop-blur-md">
      <div className="site-container flex h-16 items-center justify-between gap-2 min-[601px]:h-[72px] sm:gap-4">
        <Brand priority className="shrink-0" />

        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-[30px] min-[821px]:flex"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative text-[13px] font-semibold text-ink-muted transition-colors after:absolute after:-bottom-[9px] after:left-0 after:h-0.5 after:w-full after:origin-right after:scale-x-0 after:bg-azure after:transition-transform after:duration-200 after:content-[''] hover:text-navy-ink hover:after:origin-left hover:after:scale-x-100 focus-visible:text-navy-ink focus-visible:after:origin-left focus-visible:after:scale-x-100 motion-reduce:after:transition-none"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 min-[601px]:gap-2.5">
          <ThemeToggle className="size-10 min-[601px]:size-11" />

          <Link
            href="#question"
            className="group hidden h-[42px] items-center gap-2 rounded-[11px] border border-white/15 bg-navy px-4 text-[13px] font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-navy-deep active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-azure focus-visible:ring-offset-2 motion-reduce:active:scale-100 min-[1051px]:inline-flex"
          >
            Poser une question
            <ArrowRight
              className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
              aria-hidden
            />
          </Link>

          <SiteMobileNav />
        </div>
      </div>
    </header>
  );
}

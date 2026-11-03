"use client";

import { ArrowRight, Menu } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { navigation } from "@/lib/content/navigation";

/**
 * The desktop navigation is hidden below `lg`; this sheet is what keeps the
 * corpus, graph and sources reachable on tablet and phone.
 */
export function SiteMobileNav() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Ouvrir la navigation"
          className="size-10 rounded-xl border border-border bg-surface text-ink-muted shadow-sm hover:bg-surface-alt hover:text-navy-ink min-[601px]:size-11 min-[821px]:hidden"
        >
          <Menu className="size-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader className="pt-5">
          <SheetTitle className="font-display text-lg tracking-[-0.02em] text-navy-ink">
            Navigation
          </SheetTitle>
          <SheetDescription>
            Le corpus, l’assistant et les sources.
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Navigation mobile" className="mt-4 grid px-4">
          {navigation.map((item, index) => (
            <SheetClose asChild key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-[70px] items-center gap-4 border-b border-border font-display text-lg font-semibold text-ink transition-colors hover:text-navy-ink focus-visible:text-navy-ink"
              >
                <span className="font-sans text-[9px] font-semibold text-azure">
                  0{index + 1}
                </span>
                {item.label}
                <ArrowRight
                  className="ml-auto size-5 text-ink-muted"
                  aria-hidden
                />
              </Link>
            </SheetClose>
          ))}
        </nav>
        <div className="mt-auto border-t border-border p-4">
          <SheetClose asChild>
            <Link
              href="#question"
              className="group flex h-12 items-center justify-between rounded-[11px] border border-white/15 bg-navy px-5 text-small font-semibold text-white transition-colors hover:bg-navy-deep"
            >
              Poser une question
              <ArrowRight
                className="size-4 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden
              />
            </Link>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

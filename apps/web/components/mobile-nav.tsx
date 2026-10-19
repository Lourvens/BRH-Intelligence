"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ButtonLink } from "@/components/ui/button";
import { navigation } from "@/lib/content/navigation";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        aria-controls="menu-mobile"
        onClick={() => setOpen((value) => !value)}
        className="grid size-11 place-items-center rounded-full border border-border bg-surface text-navy transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy"
      >
        {open ? (
          <X className="size-5" aria-hidden />
        ) : (
          <Menu className="size-5" aria-hidden />
        )}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="menu-mobile"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-x-0 top-full border-b border-border bg-surface p-5 shadow-card"
          >
            <nav aria-label="Navigation mobile" className="flex flex-col">
              {navigation.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-body font-medium text-ink-muted transition-colors hover:bg-surface-alt hover:text-navy"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <ButtonLink
              href="#apercu"
              size="md"
              className="mt-3 w-full"
              onClick={() => setOpen(false)}
            >
              Voir un exemple
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

import { ExternalLink } from "lucide-react";

import { Brand } from "@/components/brand";
import {
  BankInstitutionIcon,
  PageSourceIcon,
} from "@/components/illustrations/icons";
import { footer } from "@/lib/content/home";
import { navigation } from "@/lib/content/navigation";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-[1.6fr_1fr_1.2fr]">
        <div>
          <Brand />
          <p className="mt-5 max-w-sm text-small leading-relaxed text-ink-muted">
            {footer.blurb}
          </p>

          <div className="mt-6 flex items-center gap-2 text-micro text-ink-muted">
            <BankInstitutionIcon className="size-4 text-navy" />
            <span>Documents publiés par la BRH</span>
          </div>
        </div>

        <nav aria-label="Explorer" className="text-small">
          <p className="eyebrow text-ink-muted">Explorer</p>
          <ul className="mt-4 flex flex-col gap-3">
            {navigation.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-ink-muted transition-colors hover:text-navy"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="text-small">
          <p className="eyebrow text-ink-muted">Source</p>
          <p className="mt-4 text-ink-muted leading-relaxed">{footer.source}</p>
          <a
            href="https://www.brh.ht"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 font-display text-small font-semibold text-navy hover:underline"
          >
            <span>Portail officiel brh.ht</span>
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </div>
      </div>

      <div className="border-t border-border bg-surface-alt/50">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-6 text-micro text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>BRH Intelligence · 2026 · {footer.asOf}</p>
          <p className="flex items-center gap-1.5">
            <PageSourceIcon className="size-3.5 text-navy" />
            <span>{footer.disclaimer}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

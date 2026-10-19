import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { navigation, publications } from "@/lib/content/navigation";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-navy pt-16 pb-12 text-white">
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-12 md:grid-cols-12">
          <div className="space-y-4 md:col-span-5">
            <Link
              href="/"
              aria-label="BRH Intelligence — accueil"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2"
            >
              <Image
                src="/brh-logo.png"
                alt="BRH"
                width={251}
                height={123}
                className="h-5 w-auto"
              />
              <span className="font-display text-caption font-bold text-navy">
                Intelligence
              </span>
            </Link>

            <p className="max-w-sm text-[11px] leading-relaxed text-white/70">
              Service de recherche et d’exploration documentaire sur les
              publications officielles de la Banque de la République d’Haïti.
            </p>
            <div className="text-[11px] font-medium text-white/50">
              Port-au-Prince, Haïti
            </div>
          </div>

          <div className="space-y-3 md:col-span-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gold">
              Explorer
            </div>
            <ul className="space-y-2 text-[11px] text-white/80">
              {navigation.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 md:col-span-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gold">
              Publications
            </div>
            <ul className="space-y-2 text-[11px] text-white/80">
              {publications.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3 md:col-span-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gold">
              Source
            </div>
            <p className="text-[11px] leading-relaxed text-white/70">
              Données publiques extraites de{" "}
              <a
                href="https://www.brh.ht"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-azure hover:underline"
              >
                brh.ht
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </p>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white">
              <span className="size-1.5 rounded-full bg-emerald" />
              Inventaire · 15/10/2026
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-[11px] text-white/50 md:flex-row">
          <div>© 2026 BRH Intelligence · Inventaire du 15 octobre 2026.</div>
          <div className="max-w-xl text-center leading-relaxed md:text-right">
            Les réponses peuvent contenir des erreurs. Vérifiez toujours la page
            originale du document officiel cité.
          </div>
        </div>
      </div>
    </footer>
  );
}

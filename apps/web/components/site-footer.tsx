import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const columns = [
  {
    title: "Corpus",
    links: [
      { label: "Circulaires et avis", href: "#corpus" },
      { label: "Notes de conjoncture", href: "#corpus" },
      { label: "Rapports et bilans", href: "#corpus" },
      { label: "Données IHSI", href: "#corpus" },
      { label: "Avis et communiqués", href: "#corpus" },
    ],
  },
  {
    title: "Méthode",
    links: [
      { label: "Pipeline documentaire", href: "#pipeline" },
      { label: "Recherche sémantique", href: "#pipeline" },
      { label: "Ancrage page par page", href: "#pipeline" },
      { label: "Refus explicite", href: "#faq" },
      { label: "Comparatif", href: "#comparatif" },
    ],
  },
  {
    title: "Institution",
    links: [
      { label: "Portail brh.ht", href: "https://www.brh.ht" },
      { label: "Sources publiques", href: "#corpus" },
      { label: "Questions fréquentes", href: "#faq" },
      { label: "Démonstration", href: "#demo" },
      { label: "Retour en haut", href: "#apercu" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-navy-deep bg-navy pt-16 pb-12 text-white">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link
              href="/"
              aria-label="BRH Intelligence — accueil"
              className="mb-4 inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2"
            >
              <Image
                src="/brh-logo.png"
                alt="BRH"
                width={251}
                height={123}
                className="h-5 w-auto"
              />
              <span className="font-display text-caption font-bold text-navy-deep">
                Intelligence
              </span>
            </Link>
            <p className="mb-4 max-w-sm text-caption leading-relaxed text-white/70">
              Interface de recherche sur les publications officielles de la
              Banque de la République d’Haïti. Chaque réponse renvoie au
              document et à la page qui la soutiennent.
            </p>
            <div className="flex items-center gap-2 font-mono text-[11px] text-white/60">
              <span className="size-2 rounded-full bg-emerald" />
              Prototype documentaire · v0.1
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-gold">
                {column.title}
              </h3>
              <ul className="space-y-2.5 text-caption text-white/75">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={
                        link.href.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      className="inline-flex items-center gap-1 transition-colors hover:text-white"
                    >
                      {link.label}
                      {link.href.startsWith("http") ? (
                        <ExternalLink className="size-3" aria-hidden />
                      ) : null}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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

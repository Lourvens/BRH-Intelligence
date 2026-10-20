export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "BRH Intelligence";

export const SITE_DESCRIPTION =
  "Posez vos questions sur les publications officielles de la Banque de la République d’Haïti. Réponses en français, avec le document et la page exacte.";

export const SITE_KEYWORDS = [
  "BRH",
  "Banque de la République d’Haïti",
  "publications BRH",
  "recherche documentaire",
  "inflation Haïti",
  "politique monétaire",
  "BIC",
  "inclusion financière",
];

export const OG_IMAGE = {
  url: "/og-brh-intelligence.png",
  width: 1200,
  height: 630,
  alt: "BRH Intelligence — les publications de la Banque de la République d’Haïti, sourcées page par page.",
} as const;

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_URL).toString();
}

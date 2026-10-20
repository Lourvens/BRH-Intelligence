import { corpusStats } from "@/lib/corpus-stats";

export const heroCopy = {
  eyebrow:
    "Le moteur d’intelligence documentaire de la Banque de la République d’Haïti",
  titleLead: "Les publications de la BRH.",
  titleAccent:
    "Interrogeables en langage naturel, sourcées page par page.",
  intro:
    "Accédez aux rapports, notes et circulaires publiés par la Banque de la République d’Haïti. Chaque réponse s’appuie sur un passage retrouvé et renvoie au document et à la page.",
  primaryCta: "Explorer le corpus",
  secondaryCta: "Voir une réponse citée",
  assistantCta: "Ouvrir l’assistant",
  assurances: ["Corpus francophone", "Citations page par page", "Refus explicite"],
} as const;

export const demo = {
  question: "Quel était le taux d’inflation annuel en novembre 2025 ?",
  category: "Inflation",
  answerLabel: "Inflation annuelle en Haïti",
  answerValue: "28,3\u00A0%",
  answerDetail: "glissement annuel · novembre 2025",
  answerBadge: "Nov. 2025",
  quote:
    "En novembre 2025, le taux d’inflation s’est décéléré tant en variation mensuelle qu’en rythme annuel. Sur une base annuelle, il est passé de 32,2 % en octobre 2025 à 28,3 % au cours du mois sous revue.",
  quoteHighlight: "28,3 %",
  source: "Note mensuelle d’inflation — novembre 2025",
  sourceMeta: "IHSI / BRH · p. 3",
  page: 3,
  totalPages: 10,
  documentCode: "Note mensuelle · nov. 2025",
} as const;

export const heroTags = [
  {
    title: "Banque de la République d’Haïti",
    detail: "Publications officielles",
  },
  { title: "IHSI", detail: "Statistiques" },
  { title: "brh.ht", detail: "Archive publique" },
  { title: "Économistes & chercheurs", detail: "Cas d’usage" },
] as const;

export const heroMetrics = [
  {
    value: corpusStats.catalogued,
    label: "PDF recensés",
    detail: "Inventaire brh.ht",
  },
  {
    value: corpusStats.documents,
    label: "Documents transcrits",
    detail: "Transcription OCR",
  },
  {
    value: corpusStats.pages,
    label: "Pages transcrites",
    detail: "Citation page par page",
  },
] as const;
